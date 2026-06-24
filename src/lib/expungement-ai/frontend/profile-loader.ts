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
 * Live wiring active: profiles load from GET /api/expungement-ai/profiles/{state} (the source
 * engine's public projection). The bundled `all51.json` is retained only as the static
 * jurisdiction index for the state picker and for missing/unknown classification, not for the
 * flow itself.
 */
const USE_LIVE_PROFILE_ENDPOINT = true;

const PROFILES_BY_STATE = all51 as Record<string, unknown>;

export type LoadProfileResult = ParseResult<JurisdictionProfile>;

/** Normalize a state/abbreviation input to the uppercase key used by the profile source. */
export function normalizeStateKey(state: string): string {
  return state.trim().toUpperCase();
}

/** The list of jurisdiction codes available from the mock source (50 states + DC). */
export function listAvailableStateKeys(): string[] {
  return Object.keys(PROFILES_BY_STATE).sort();
}

export type JurisdictionListItem = { code: string; name: string; slug: string };

/**
 * The selectable jurisdictions for the state picker, with display names, sorted by name. Derived
 * from the profile source so the picker and the flow always agree. Reads each profile's
 * `jurisdiction` block defensively, falling back to the map key if a name is missing.
 */
export function listAvailableJurisdictions(): JurisdictionListItem[] {
  return Object.entries(PROFILES_BY_STATE)
    .map(([key, raw]) => {
      const jurisdiction = (raw as { jurisdiction?: Partial<JurisdictionListItem> } | null)?.jurisdiction;
      return {
        code: jurisdiction?.code ?? key,
        name: jurisdiction?.name ?? key,
        slug: jurisdiction?.slug ?? key.toLowerCase()
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
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
/**
 * Hard ceiling on the live profile request. Without this, a hung or never-resolving fetch would
 * leave the screening flow stuck on the "Loading your state's questions…" skeleton forever. The
 * timeout converts a stall into a calm, retryable error state instead.
 */
const PROFILE_FETCH_TIMEOUT_MS = 10_000;

async function fetchLiveProfile(
  key: string
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/expungement-ai/profiles/${encodeURIComponent(key)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(PROFILE_FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
      return { ok: false, error: `Profile request failed (${response.status}).` };
    }
    return { ok: true, value: (await response.json()) as unknown };
  } catch {
    return { ok: false, error: "We could not load this state's questions. Please try again." };
  }
}
