import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminSession, SessionPartnerError } from "@/lib/partners/session-partner";
import { getServerAuthState } from "@/lib/supabase/auth-server";

type InternalAdminAccess =
  | { kind: "allowed"; session: Awaited<ReturnType<typeof requireInternalAdminSession>> }
  | { kind: "denied"; title: string; body: string; email: string };

export async function resolveInternalAdminPageAccess(nextPath: string): Promise<InternalAdminAccess> {
  try {
    const session = await requireInternalAdminSession();
    logSecurityInfo({
      event: "internal_admin access allowed",
      route: nextPath,
      outcome: "allowed",
      metadata: { auth_user_id: session.authUserId, role: session.role, decision: "allow" }
    });
    return { kind: "allowed", session };
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "internal_admin gate denied", route: nextPath, outcome: "unauthenticated", error });
      redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
    }

    if (error instanceof SessionPartnerError) {
      const auth = await getServerAuthState();
      const email = auth.isAuthenticated ? auth.email?.trim().toLowerCase() || "Email unavailable" : "Email unavailable";
      logSecurityWarn({
        event: "internal_admin access denied",
        route: nextPath,
        outcome: "forbidden",
        error,
        metadata: {
          auth_user_id: auth.isAuthenticated ? auth.userId : undefined,
          decision: "deny"
        }
      });
      return {
        kind: "denied",
        title: "Internal admin access denied",
        body: "This signed-in account does not have an active LegalEase internal administrator authorization.",
        email
      };
    }

    throw error;
  }
}

export async function requireInternalAdminRouteAccess() {
  const session = await requireInternalAdminSession();
  logSecurityInfo({
    event: "internal_admin API access allowed",
    route: "internal_api",
    outcome: "allowed",
    metadata: { auth_user_id: session.authUserId, role: session.role, decision: "allow" }
  });
  return session;
}

export async function InternalAdminDenied({ title, body, email }: { title: string; body: string; email?: string }) {
  const auth = email ? null : await getServerAuthState();
  const signedInEmail = email ?? (auth?.isAuthenticated ? auth.email : undefined) ?? "Email unavailable";
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
          <p className="mt-4 break-all text-sm font-bold text-navy">Signed in as: {signedInEmail}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <form action="/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </form>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-navy px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
            >
              Sign in with another account
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
