import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type ServerAuthState =
  | {
      isAuthenticated: true;
      userId: string;
      email?: string;
    }
  | {
      isAuthenticated: false;
      userId?: undefined;
      email?: undefined;
    };

export async function createServerSupabaseAuthClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components can read cookies but cannot always write refreshed auth cookies.
          }
        }
      }
    }
  });
}

export async function getServerAuthState(): Promise<ServerAuthState> {
  const supabase = await createServerSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { isAuthenticated: false };
  }

  return {
    isAuthenticated: true,
    userId: data.user.id,
    email: data.user.email ?? undefined
  };
}
