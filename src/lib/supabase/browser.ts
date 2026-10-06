"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient(url, anonKey, {
    auth: {
      // The password page consumes the callback once and retains its result
      // across effect replay. Other auth pages keep the SDK's automatic flow.
      detectSessionInUrl: typeof window !== "undefined" && window.location.pathname !== "/auth/set-password"
    }
  });
}
