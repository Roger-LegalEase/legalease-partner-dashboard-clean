/**
 * The exact-matter destination.
 *
 * Contract §15 requires that a successful claim always lands on the exact
 * matter, never a generic dashboard and never an empty Briefcase. One helper
 * owns that path so the claim service, the browser handoff and the redirect
 * validators cannot drift apart.
 *
 * No server-only imports: the sign-in form validates a redirect with the same
 * predicate the server produced it with.
 */

const EXACT_MATTER_PATH = /^\/briefcase\/matters\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function exactMatterPath(matterId: string): string {
  return `/briefcase/matters/${encodeURIComponent(matterId)}`;
}

export function isExactMatterPath(value: string): boolean {
  return EXACT_MATTER_PATH.test(value);
}
