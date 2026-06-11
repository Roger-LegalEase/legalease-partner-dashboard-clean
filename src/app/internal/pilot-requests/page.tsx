import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Building2, Mail, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { listPilotRequestsForInternalAdmin, type InternalPilotRequest } from "@/lib/partners/pilot-requests";
import { pilotRequestStatusLabels } from "@/lib/partners/pilot-request-status";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { PilotRequestStatusControl } from "./PilotRequestStatusControl";

export const dynamic = "force-dynamic";

export default async function InternalPilotRequestsPage() {
  const result = await loadPilotRequests();

  if (result.kind === "redirect") {
    redirect(result.href);
  }

  if (result.kind === "denied") {
    return <DeniedPage />;
  }

  const requests = result.requests;
  const newCount = requests.filter((request) => request.status === "new").length;
  const qualifiedCount = requests.filter((request) => request.status === "qualified" || request.status === "converted_to_partner").length;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href="/partner/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Command Center
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">Partner Leads / Pilot Requests</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Review organizations that submitted the public Partner Program pilot request form. This queue is gated
              server-side by the authenticated internal_admin identity before any pilot request data is read.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Read path</p>
                <p className="text-xs text-grayWilma-600">Internal admin session required</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              The public request form remains browser write-only. Queue reads and status updates run server-side only.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total requests" value={requests.length} />
          <SummaryCard label="New" value={newCount} />
          <SummaryCard label="Qualified / converted" value={qualifiedCount} />
        </section>

        <section className="mt-8 grid gap-4">
          {requests.length === 0 ? (
            <Card className="rounded-md p-6">
              <p className="text-lg font-black text-navy">No pilot requests yet.</p>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">New public submissions will appear here after the server-side intake route inserts them.</p>
            </Card>
          ) : (
            requests.map((request) => <PilotRequestCard key={request.id} request={request} />)
          )}
        </section>
      </div>
    </main>
  );
}

type LoadResult =
  | { kind: "ready"; requests: InternalPilotRequest[] }
  | { kind: "redirect"; href: string }
  | { kind: "denied" };

async function loadPilotRequests(): Promise<LoadResult> {
  try {
    return {
      kind: "ready",
      requests: await listPilotRequestsForInternalAdmin()
    };
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        return { kind: "redirect", href: "/sign-in?next=/internal/pilot-requests" };
      }

      return { kind: "denied" };
    }

    throw error;
  }
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-md p-5">
      <p className="text-3xl font-black text-navy">{value}</p>
      <p className="mt-2 text-sm font-semibold text-grayWilma-700">{label}</p>
    </Card>
  );
}

function PilotRequestCard({ request }: { request: InternalPilotRequest }) {
  return (
    <Card className="rounded-md p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={request.status === "converted_to_partner" || request.status === "qualified" ? "teal" : request.status === "not_a_fit" ? "orange" : "blue"}>
              {pilotRequestStatusLabels[request.status]}
            </Badge>
            <span className="text-xs font-semibold text-grayWilma-600">{formatDateTime(request.createdAt)}</span>
          </div>
          <h2 className="mt-3 text-2xl font-black text-navy">{request.organizationName}</h2>
          <p className="mt-2 text-sm font-semibold text-grayWilma-800">{request.contactName}{request.roleTitle ? `, ${request.roleTitle}` : ""}</p>
          <div className="mt-4 grid gap-2 text-sm text-grayWilma-700 md:grid-cols-2">
            <ContactLine icon={<Mail className="h-4 w-4" />} value={request.email} />
            {request.phone ? <ContactLine icon={<Phone className="h-4 w-4" />} value={request.phone} /> : null}
            <ContactLine icon={<Building2 className="h-4 w-4" />} value={request.organizationType} />
            <ContactLine icon={<ShieldCheck className="h-4 w-4" />} value={request.stateOrJurisdiction} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoBlock label="Interested workflow" value={request.interestedWorkflow ?? "Not specified"} />
            <InfoBlock label="Estimated people served" value={request.estimatedPeopleServed ?? "Not specified"} />
          </div>
          <InfoBlock className="mt-3" label="Community served" value={request.communityServed} />
          {request.message ? <InfoBlock className="mt-3" label="Message" value={request.message} /> : null}
          <p className="mt-3 text-xs font-semibold text-grayWilma-500">Updated timestamp is not tracked by the phase-23 partner_pilot_requests schema.</p>
        </div>
        <aside className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-grayWilma-600">Status</p>
          <div className="mt-3">
            <PilotRequestStatusControl id={request.id} status={request.status} />
          </div>
          <p className="mt-4 text-xs leading-5 text-grayWilma-600">Source: {request.source}</p>
        </aside>
      </div>
    </Card>
  );
}

function ContactLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="text-teal">{icon}</span>
      <span className="truncate">{value}</span>
    </p>
  );
}

function InfoBlock({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-md border border-grayWilma-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-xs font-black uppercase tracking-wide text-grayWilma-600">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-grayWilma-800">{value}</p>
    </div>
  );
}

function DeniedPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10 md:px-6">
        <Card className="rounded-md p-6">
          <Badge tone="orange">Access denied</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Internal admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This Command Center queue is only available to authenticated LegalEase internal_admin users.
          </p>
        </Card>
      </div>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
