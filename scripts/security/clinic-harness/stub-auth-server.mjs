import { currentAuth } from "./control.mjs";

export async function getServerAuthState() {
  return currentAuth();
}

// The real partner-session module imports this at module scope. The harness
// overrides `resolveSessionPartner`, so the client itself is never exercised;
// returning null keeps any accidental use loud rather than silently permissive.
export async function createServerSupabaseAuthClient() {
  return null;
}
