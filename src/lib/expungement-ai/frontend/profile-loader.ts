/**
 * Adapter: load a jurisdiction profile.
 *
 * This is one of the TWO integration points between the frontend and the engine. Swapping the
 * mock for the live endpoint must be limited to this file.
 *
 *   Production: GET /api/expungement-ai/profiles/{state}
 *   This branch: read the bundled, trimmed consumer profiles (the mock source).
 *
 * The frontend renders the profile. It never authors it. All loaded data is validated as
 * untrusted input before it is returned (see `./schemas.ts`); a malformed or missing profile
 * resolves to a calm error result, never a thrown exception in the render path.
 */
import { type JurisdictionProfile } from "./contracts";
import { parseJurisdictionProfile, type ParseResult } from "./schemas";
import all51 from "./profiles/all51.json";

/**
 * Flip to `true` only once Codex's `/profiles/{state}` endpoint is live and the backend branch
 * has merged to `main`. Until then the bundled mock profiles stand in.
 */
const USE_LIVE_PROFILE_ENDPOINT = false;

const PROFILES_BY_STATE = all51 as Record<string, unknown>;

export type LoadProfileResult = ParseResult<JurisdictionProfile>;

/** Normalize a state/abbreviation input to the uppercase key used by the profile source. */
export function normalizeStateKey(state: string): string {
  return state.trim().toUpperCase();
}

/** The list of jurisdictions available from the mock source (50 states + DC). */
export function listAvailableStateKeys(): string[] {
  return Object.keys(PROFILES_BY_STATE).sort();
}

/**
 * Load and validate the jurisdiction profile for a state. Returns a discriminated result so
 * callers render a calm error state instead of catching exceptions.
 */
export async function loadJurisdictionProfile(state: string): Promise<LoadProfileResult> {
  const key = normalizeStateKey(state);

  if (!key) {
    return { ok: false, error: "No state was provided." };
  }

  const raw = USE_LIVE_PROFILE_ENDPOINT
    ? await fetchLiveProfile(key)
    : loadMockProfile(key);

  if (!raw.ok) {
    return raw;
  }

  return parseJurisdictionProfile(raw.value);
}

function loadMockProfile(key: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const value = PROFILES_BY_STATE[key];
  if (value === undefined) {
    return { ok: false, error: `No jurisdiction profile is available for "${key}".` };
  }
  return { ok: true, value };
}

/**
 * Live profile fetch. Not active on this branch (guarded by `USE_LIVE_PROFILE_ENDPOINT`). The
 * response is still validated by `loadJurisdictionProfile` before render; the engine's live
 * response is the source of truth for the profile shape.
 */
async function fetchLiveProfile(
  key: string
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/expungement-ai/profiles/${encodeURIComponent(key)}`, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      return { ok: false, error: `Profile request failed (${response.status}).` };
    }
    return { ok: true, value: (await response.json()) as unknown };
  } catch {
    return { ok: false, error: "We could not load this state's questions. Please try again." };
  }
}
