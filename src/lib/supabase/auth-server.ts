import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type ServerAuthState =
  | {
      isAuthenticated: true;
      userId: string;
      email?: string;
      /**
       * Contract §8 and Correction 4: an unverified signup record does not
       * receive a matter or a Briefcase. Supabase stamps confirmed_at when a
       * project has email confirmation disabled, so this stays true in both
       * configurations rather than depending on which one is deployed.
       */
      isVerified: boolean;
    }
  | {
      isAuthenticated: false;
      userId?: undefined;
      email?: undefined;
      isVerified?: undefined;
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
    email: data.user.email ?? undefined,
    isVerified: Boolean(
      data.user.email_confirmed_at ?? data.user.phone_confirmed_at ?? data.user.confirmed_at
    )
  };
}
