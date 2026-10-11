import { LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { logSecurityWarn } from "@/lib/observability/logger";
import { getPartnerTeamPageData, type ResolvedPartnerAdminSession } from "@/lib/partners/partner-team";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { PartnerTeamInviteForm } from "./PartnerTeamInviteForm";

export const dynamic = "force-dynamic";

export default async function PartnerTeamPage() {
  const access = await loadPartnerTeamAccess();

  if (access.kind === "redirect") {
    redirect(access.href);
  }

  if (access.kind === "denied") {
    return <DeniedTeamPage title={access.title} body={access.body} />;
  }

  const team = await getPartnerTeamPageData(access.sessionPartner);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy" data-partner-team-role={access.sessionPartner.role} data-partner-team-slug={access.sessionPartner.partnerSlug}>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="mb-6">
          <Link href="/partner/dashboard" className="text-sm font-semibold text-[#08786F] hover:text-navy">
            <LocalizedRuntimeText text="Back to dashboard"/>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-md p-6">
            <Badge tone="blue"><LocalizedRuntimeText text="Partner team"/></Badge>
            <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-[#08786F]">
              <UsersRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-navy">{team.partnerName}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              <LocalizedRuntimeText text="Invite staff for your LegalEase partner workspace. New users receive the standard password setup flow."/>
            </p>

            <section aria-label="Team members" className="mt-6 divide-y rounded-md border border-grayWilma-200">
              {team.members===null ? <p role="alert" className="p-4"><LocalizedRuntimeText text="Team members could not be loaded."/> <a href="/partner/team" className="inline-flex min-h-11 items-center underline"><LocalizedRuntimeText text="Reload team"/></a></p> : team.members.length ? team.members.map(member=><dl key={member.id} className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                <div className="min-w-0"><dt className="font-bold"><LocalizedRuntimeText text="Email"/></dt><dd className="break-all">{member.email??<LocalizedRuntimeText text="Email unavailable"/>}</dd></div>
                <div><dt className="font-bold"><LocalizedRuntimeText text="Role"/></dt><dd><LocalizedRuntimeText text={formatRole(member.role)}/></dd></div>
                <div><dt className="font-bold"><LocalizedRuntimeText text="Status"/></dt><dd><LocalizedRuntimeText text={formatStatus(member.status)}/></dd></div>
                <div><dt className="font-bold"><LocalizedRuntimeText text="Created"/></dt><dd>{formatDate(member.createdAt)}</dd></div>
              </dl>):<p className="p-4"><LocalizedRuntimeText text="No team members are visible yet."/></p>}
            </section>
            <Link className="mt-4 inline-flex min-h-11 items-center underline" href="/partner/clinic"><LocalizedRuntimeText text="Manage clinic event permissions"/></Link>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-xl font-black text-navy"><LocalizedRuntimeText text="Invite partner staff"/></h2>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700"><LocalizedRuntimeText text="Role is fixed as Partner staff for self-serve partner invites."/></p>
            <div className="mt-5">
              <PartnerTeamInviteForm partnerSlug={team.partnerSlug} partnerName={team.partnerName} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

type TeamAccess =
  | { kind: "allowed"; sessionPartner: ResolvedPartnerAdminSession }
  | { kind: "redirect"; href: string }
  | { kind: "denied"; title: string; body: string };

async function loadPartnerTeamAccess(): Promise<TeamAccess> {
  try {
    const sessionPartner = await resolveSessionPartner();

    if (sessionPartner.kind === "internal_admin") {
      return { kind: "redirect", href: "/dashboard/partners" };
    }

    if (sessionPartner.role !== "partner_admin") {
      logSecurityWarn({ event: "partner_team denied", route: "/partner/team", outcome: "forbidden" });
      return {
        kind: "denied",
        title: "Partner team access denied",
        body: "Partner admin access is required to manage team invitations."
      };
    }

    return { kind: "allowed", sessionPartner: { ...sessionPartner, role: "partner_admin" } };
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        logSecurityWarn({ event: "partner_team denied", route: "/partner/team", outcome: "unauthenticated", error });
        return { kind: "redirect", href: "/sign-in?next=/partner/team" };
      }

      logSecurityWarn({ event: "partner_team denied", route: "/partner/team", outcome: "forbidden", error });
      return {
        kind: "denied",
        title: "Partner team access denied",
        body: "Your authenticated account does not have an active partner admin identity."
      };
    }

    throw error;
  }
}

function DeniedTeamPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy"><LocalizedRuntimeText text={title}/></h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700"><LocalizedRuntimeText text={body}/></p>
          <Link href="/partner/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
            <LocalizedRuntimeText text="Back to dashboard"/>
          </Link>
        </Card>
      </div>
    </main>
  );
}

function formatRole(role: string) {
  return role === "partner_admin" ? "Partner admin" : "Partner staff";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toISOString().slice(0,10);
}
