/**
 * Shared partner/session-mode detection for the screening flow.
 *
 * A screening that began through a partner program arrives with a `?session=<uuid>`. That id is
 * validated with this single pattern so the server route (`[state]/page.tsx`) and the client flow
 * (`ScreeningFlow`) can never drift on what counts as a valid session.
 */
// RFC-4122 v1-5 UUID (version nibble 1-5, RFC variant 8/9/a/b). Five hyphen-separated groups:
// 8-4-4-4-12. NOTE: the prior inline regex in [state]/page.tsx was missing the 4th group/hyphen
// (it read `...-[89ab][0-9a-f]{12}$`), so it matched NO real 36-char UUID — every ?session= was
// rejected and partner mode silently fell back to the DTC "$50" branch. That is the actual bug.
export const SAFE_SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafeSessionId(value: string | null | undefined): value is string {
  return typeof value === "string" && SAFE_SESSION_UUID.test(value);
}

/**
 * The session id that puts the flow in partner mode: the server-provided prop, or — when the server
 * render did not carry it (e.g. a statically optimized response) — a valid `?session=` read from the
 * URL on the client.
 *
 * Intentionally NOT derived from the live screening `sessionId` state: a direct-to-consumer user who
 * later saves progress also gets a `sessionId`, and must keep the $50 consumer flow.
 */
export function resolvePartnerSessionId(
  initialSessionId: string | undefined,
  urlSessionId: string | null | undefined
): string | undefined {
  return initialSessionId ?? (isSafeSessionId(urlSessionId) ? urlSessionId : undefined);
}
