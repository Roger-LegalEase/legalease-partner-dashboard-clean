import Link from "next/link";
import { redirect } from "next/navigation";
import { logSecurityWarn } from "@/lib/observability/logger";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import {
  getPartnerAccessCodeAnalytics,
  type PartnerAccessCodeAnalytics
} from "@/lib/partners/partner-access-codes";
import { PartnerAccessCodesManager } from "./PartnerAccessCodesManager";

export const dynamic = "force-dynamic";

const ROUTE = "/partner/access-codes";

type Access =
  | { kind: "redirect"; href: string }
  | { kind: "denied"; title: string; body: string }
  | { kind: "allowed"; partnerSlug: string; role: string };

export default async function PartnerAccessCodesPage() {
  const access = await loadAccess();

  if (access.kind === "redirect") redirect(access.href);
  if (access.kind === "denied") {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-black">{access.title}</h1>
          <p className="mt-3 text-sm text-[#5C5750]">{access.body}</p>
        </div>
      </main>
    );
  }

  let analytics: PartnerAccessCodeAnalytics | null = null;
  let loadError: string | null = null;
  try {
    analytics = await getPartnerAccessCodeAnalytics(access.partnerSlug);
  } catch {
    loadError = "Access code data is temporarily unavailable. You can still create codes below.";
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="mb-6">
          <Link href="/partner/dashboard" className="text-sm font-semibold text-[#1D9E75] hover:text-[#0F1E3D]">
            Back to dashboard
          </Link>
        </div>

        <header className="mb-6">
          <h1 className="text-3xl font-black">Access codes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5C5750]">
            Access codes help you control who uses your sponsored packet allocation. You can create one shared code,
            multiple campaign codes, single-use invite codes, or no codes at all. Packet credits are only used when
            Expungement.ai successfully generates a personalized record-clearing packet &mdash; screenings, account
            creation, and ineligible results do not use packet credits.
          </p>
        </header>

        {loadError ? (
          <p className="mb-4 rounded-md border border-[#F3C9B8] bg-[#FDF1E8] px-4 py-3 text-sm text-[#9A3412]">{loadError}</p>
        ) : null}

        <PartnerAccessCodesManager
          partnerSlug={access.partnerSlug}
          initialAnalytics={analytics}
        />
      </div>
    </main>
  );
}

async function loadAccess(): Promise<Access> {
  try {
    const session = await resolveSessionPartner();
    if (session.kind === "internal_admin") {
      return { kind: "redirect", href: "/dashboard/partners" };
    }
    if (session.role !== "partner_admin") {
      logSecurityWarn({ event: "access codes denied", route: ROUTE, outcome: "forbidden" });
      return {
        kind: "denied",
        title: "Access denied",
        body: "Partner admin access is required to manage access codes."
      };
    }
    return { kind: "allowed", partnerSlug: session.partnerSlug, role: session.role };
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        return { kind: "redirect", href: `/sign-in?next=${ROUTE}` };
      }
      logSecurityWarn({ event: "access codes denied", route: ROUTE, outcome: "forbidden", error });
      return {
        kind: "denied",
        title: "Access denied",
        body: "Your account does not have an active partner admin identity."
      };
    }
    throw error;
  }
}
