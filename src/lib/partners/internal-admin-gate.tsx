import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminSession, SessionPartnerError } from "@/lib/partners/session-partner";

type InternalAdminAccess =
  | { kind: "allowed" }
  | { kind: "denied"; title: string; body: string };

export async function resolveInternalAdminPageAccess(nextPath: string): Promise<InternalAdminAccess> {
  try {
    await requireInternalAdminSession();
    logSecurityInfo({ event: "internal_admin gate allow", route: nextPath, outcome: "allowed" });
    return { kind: "allowed" };
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "internal_admin gate denied", route: nextPath, outcome: "unauthenticated", error });
      redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "internal_admin gate denied", route: nextPath, outcome: "forbidden", error });
      return {
        kind: "denied",
        title: "Internal admin access denied",
        body: "Your authenticated account is not authorized for LegalEase internal admin tools."
      };
    }

    throw error;
  }
}

export async function requireInternalAdminRouteAccess() {
  await requireInternalAdminSession();
  logSecurityInfo({ event: "internal_admin route gate allow", route: "internal_api", outcome: "allowed" });
}

export function InternalAdminDenied({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
          <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
            Sign in with another account
          </Link>
        </Card>
      </div>
    </main>
  );
}
