/**
 * Shared partner-session identifier validation for the screening route.
 *
 * A screening that began through a partner program arrives with a
 * `?session=<uuid>`. UUID shape is only the first input check. The server route
 * must also verify the session is an active RCAP-benefit session before it
 * passes `initialSessionId` to the client flow.
 */
// RFC-4122 v1-5 UUID (version nibble 1-5, RFC variant 8/9/a/b). Five hyphen-separated groups:
// 8-4-4-4-12. NOTE: the prior inline regex in [state]/page.tsx was missing the 4th group/hyphen
// (it read `...-[89ab][0-9a-f]{12}$`), so it matched NO real 36-char UUID — every ?session= was
// rejected and partner mode silently fell back to the DTC "$50" branch. That is the actual bug.
export const SAFE_SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafeSessionId(value: string | null | undefined): value is string {
  return typeof value === "string" && SAFE_SESSION_UUID.test(value);
}
