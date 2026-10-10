import "server-only";

/** Read the auth service's public configuration; never infer OAuth from a key name. */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings?.external?.google === true;
  } catch {
    // Password and secure-email sign-in remain available during a settings outage.
    return false;
  }
}
