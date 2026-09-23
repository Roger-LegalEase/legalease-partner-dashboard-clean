// Readback predicates for the existing hosted acceptance probes. Transport
// errors and server errors cannot prove an authorization refusal.
export function internalGalleryRefusal(response, origin, nextPath) {
  if (response.fromProtectionLayer || !Number.isInteger(response.status)) return false;
  if ([303, 307, 308].includes(response.status)) {
    try {
      const target = new URL(response.location, origin);
      return target.origin === new URL(origin).origin && target.pathname === "/sign-in"
        && target.searchParams.get("next") === nextPath;
    } catch { return false; }
  }
  // Next may stream the redirect in a 200, or render the explicit denied shell.
  return response.status === 200 && (
    response.body.includes("Internal admin access denied")
    || (response.body.includes("NEXT_REDIRECT")
      && response.body.includes(`/sign-in?next=${encodeURIComponent(nextPath)}`))
  );
}

export function deliveryRefusal(response, origin) {
  if ([401, 403, 404].includes(response.status)) return true;
  if (![303, 307, 308].includes(response.status)) return false;
  try {
    const target = new URL(response.location, origin);
    return target.origin === new URL(origin).origin && target.pathname === "/sign-in";
  } catch { return false; }
}

export function privateObjectRefusal(status) {
  // Supabase's public object route reports a private bucket as not found (400).
  return [400, 401, 403, 404].includes(status);
}

export function cardEntryEvidence(notes) {
  return ["card number: filled", "card expiry: filled", "card cvc: filled"].every((note) => notes.includes(note));
}
