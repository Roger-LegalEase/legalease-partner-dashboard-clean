import { ShieldCheck } from "lucide-react";
import { getServerAuthState } from "@/lib/supabase/auth-server";

/**
 * The CMS denial page. Mirrors InternalAdminDenied, but does not reuse src/components/ui/Card —
 * that component references Tailwind classes (grayWilma-*) that are not in the config and emit no
 * CSS. Everything here uses real tokens.
 *
 * An authenticated user without canonical internal authorization lands here rather than being
 * bounced to sign-in, which would be a redirect loop: they are signed in, but not authorized.
 */
export async function ContentDenied({ title, body }: { title: string; body: string }) {
  const auth = await getServerAuthState();
  const email = auth.isAuthenticated ? auth.email?.trim().toLowerCase() || "Email unavailable" : "Email unavailable";
  return (
    <main className="min-h-screen bg-cream text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <div className="w-full rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Internal access requires an active UUID-bound LegalEase internal-administrator membership.
          </p>
          <p className="mt-4 break-all text-sm font-bold text-navy">Signed in as: {email}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <form action="/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </form>
            <form action="/sign-out" method="post">
              <input type="hidden" name="intent" value="switch-account" />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border-2 border-navy px-5 py-2 text-sm font-semibold text-navy transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                Sign in with another account
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
