import Link from "next/link";
import { BarChart3, BriefcaseBusiness, ClipboardList, ExternalLink, FileCheck2, Flag, LifeBuoy, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getOnboardingStatusLabel, getPaymentStatusLabel, getProvisioningStatusLabel } from "@/lib/partners/partner-service";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { partnerDocuments, partnerIntake, partnerPublicPage } from "@/lib/partners/routes";
import { getPartnerDocumentActivitySummary } from "@/lib/rcap/documents/mississippi/repository";

export default async function PartnerSpecificDashboardPlaceholder({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/dashboard/partners/${partnerSlug}`);

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const partner = await getPartnerRecordBySlug(partnerSlug);
  const documentActivity = await getPartnerDocumentActivitySummary(partnerSlug);

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
          <Card className="w-full rounded-md p-6 text-center">
            <h1 className="text-3xl font-black text-navy">Partner not found</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              This dashboard placeholder does not match a seeded LegalEase partner record.
            </p>
            <Link
              href="/partners"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
            >
              Back to Partner Program
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  if (partnerSlug === "we-must-vote") {
    return <WeMustVoteDashboard partner={partner} documentActivity={documentActivity} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="blue">Partner profile</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">{partner.organizationName ?? partner.partnerName}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            {partner.programDescription ?? partner.programGoal}
          </p>
          <div className="mt-6 grid gap-3 text-left md:grid-cols-2">
            <StatusCard label="Payment" value={getPaymentStatusLabel(partner.paymentStatus)} />
            <StatusCard label="Provisioning" value={getProvisioningStatusLabel(partner.provisioningStatus)} />
            <StatusCard label="Onboarding" value={getOnboardingStatusLabel(partner.onboardingStatus)} />
            <StatusCard label="Primary contact" value={`${partner.primaryContactName ?? partner.contactName} · ${partner.primaryContactEmail ?? partner.contactEmail}`} />
            <StatusCard label="Target geography" value={`${partner.serviceArea ?? partner.region}, ${partner.targetState ?? partner.state}`} />
            <StatusCard label="Expected launch" value={partner.expectedLaunchDate ?? partner.launchDateTarget} />
            <StatusCard label="MS/IL document packets started" value={String(documentActivity.totalPackets)} />
            <StatusCard label="MS/IL packets missing info" value={String(documentActivity.missingInformationPackets)} />
            <StatusCard label="MS/IL packets ready for review" value={String(documentActivity.readyForReviewPackets)} />
            <StatusCard label="Briefcase items" value={String(documentActivity.briefcaseItems)} />
            <StatusCard label="Latest MS packet" value={documentActivity.latestPacketDate ?? "None yet"} />
          </div>
          <div className="mt-6 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4 text-left">
            <p className="text-sm font-black text-navy">Document activity</p>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700">
              Pathway breakdown: {Object.entries(documentActivity.pathwayBreakdown).map(([pathway, count]) => `${pathway.replaceAll("_", " ")}: ${count}`).join(", ") || "No packets yet"}.
            </p>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700">
              State breakdown: {Object.entries(documentActivity.stateBreakdown).map(([state, count]) => `${state}: ${count}`).join(", ") || "No packets yet"}.
            </p>
          </div>
          <Link
            href="/dashboard/partners"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Back to Partner Dashboard
          </Link>
        </Card>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}

function WeMustVoteDashboard({
  partner,
  documentActivity
}: {
  partner: NonNullable<Awaited<ReturnType<typeof getPartnerRecordBySlug>>>;
  documentActivity: Awaited<ReturnType<typeof getPartnerDocumentActivitySummary>>;
}) {
  const signupLink = partnerPublicPage(partner.partnerSlug);
  const intakeLink = partnerIntake(partner.partnerSlug);
  const documentsLink = partnerDocuments(partner.partnerSlug);
  const partnerName = "We Must Vote";

  const metrics = [
    { label: "Participants", value: String(partner.metrics.referrals), helper: "People referred through We Must Vote outreach" },
    { label: "Initial Screening", value: String(partner.metrics.screenings), helper: "Mississippi self-help screenings started through launch paths" },
    { label: "Possible Match", value: String(partner.metrics.likelyEligible), helper: "Answers may match basic screening criteria" },
    { label: "Self-help packets", value: String(documentActivity.readyForReviewPackets || partner.metrics.packetsReady), helper: "Saved Mississippi packet access activity" }
  ];

  const capabilities = [
    { title: "View participants", body: "See people entering through the We Must Vote signup link.", icon: UsersRound },
    { title: "Monitor launch readiness", body: "Use v2.1 self-help milestones while Phase 20A case-level status alignment is pending.", icon: ClipboardList },
    { title: "Support self-help packet access", body: "Monitor saved Mississippi packets and Briefcase activity without treating the dashboard as a legal review queue.", icon: FileCheck2 },
    { title: "Identify support needs", body: "Find missing information, stalled packet access, and participants who may need administrative outreach.", icon: LifeBuoy },
    { title: "Access reports and resources", body: "Use weekly reporting, launch resources, and impact summaries as they become available.", icon: BarChart3 }
  ];

  const readinessMilestones = [
    {
      title: "Initial Screening / Possible Match",
      body: "A participant's answers may match basic screening criteria for a possible Mississippi record-clearing pathway."
    },
    {
      title: "Self-Represented Filing Option",
      body: "Users may choose to prepare and file a self-help packet on their own without attorney representation."
    },
    {
      title: "Administrative Completeness Check",
      body: "Staff may check whether required fields, documents, and signatures appear present. Staff cannot determine eligibility, approve legal sufficiency, or tell users whether they should file."
    },
    {
      title: "Self-Help Packet Access",
      body: "Saved Mississippi packet previews and downloads remain available while v2 case-level persistence alignment continues."
    },
    {
      title: "Filing Guidance",
      body: "Participants can review procedural filing next steps and decide whether to file pro se."
    },
    {
      title: "Outcome Follow-Up",
      body: "Partners may help users report court responses without treating unverified outcomes as final impact numbers."
    }
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <Badge tone="teal">Partner dashboard</Badge>
              <h1 className="mt-4 text-4xl font-black leading-tight text-navy">Welcome, {partnerName}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
                Your launch dashboard is configured for the Mississippi Expungement Workflow. Use this home base to share the public signup link, monitor self-help packet activity, and identify people who may need administrative follow-up. Case Journey Model: Phase 20A Alignment Pending.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={signupLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
                  Open public signup link
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100">
                  Dashboard sign in
                </Link>
              </div>
            </div>
            <Card className="rounded-md bg-[#f7f8f6] p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                  <Flag className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-black text-navy">Public signup link</p>
                  <p className="text-xs text-grayWilma-600">Share this with Mississippi participants</p>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-grayWilma-200 bg-white p-3">
                <p className="break-all text-sm font-black text-navy">{signupLink}</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-grayWilma-600">Participants do not need to understand partner slugs. This link opens the We Must Vote + LegalEase signup experience.</p>
            </Card>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="rounded-md p-5">
              <p className="text-xs font-semibold uppercase text-grayWilma-600">{metric.label}</p>
              <p className="mt-2 text-3xl font-black text-navy">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-grayWilma-600">{metric.helper}</p>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="rounded-md p-6">
            <Badge tone="blue">What you can do</Badge>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-sm font-black text-navy">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-grayWilma-700">{item.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <Badge tone="teal">Launch workflow</Badge>
            <h2 className="mt-4 text-xl font-black text-navy">Mississippi only</h2>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700">
              We Must Vote participants can start Initial Screening / Possible Match, use the Self-Represented Filing Option, complete the Mississippi petition information form, access saved self-help packets, and review Filing Guidance where supported.
            </p>
            <div className="mt-5 grid gap-2">
              {readinessMilestones.map((milestone) => (
                <div key={milestone.title} className="rounded-md bg-[#f7f8f6] px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal" />
                    <p className="text-sm font-semibold text-grayWilma-800">{milestone.title}</p>
                  </div>
                  <p className="mt-1 pl-4 text-xs leading-5 text-grayWilma-600">{milestone.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-grayWilma-600">
              Attorney Checkpoint applies only to flagged cases and is not promised for every participant. This launch surface is not yet the full v2 partner review queue.
            </p>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <DashboardLinkCard title="Public signup page" body="Co-branded We Must Vote + LegalEase entry point for Mississippi participants." href={signupLink} />
          <DashboardLinkCard title="Mississippi record review" body="Direct participant intake path for the launch workflow." href={intakeLink} />
          <DashboardLinkCard title="Packet workflow" body="Mississippi petition form, saved packet preview, filing next steps, and PDF downloads." href={documentsLink} />
        </section>

        <section className="mt-6 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy">Packet and Briefcase activity</h2>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">
                Pathway breakdown: {Object.entries(documentActivity.pathwayBreakdown).map(([pathway, count]) => `${pathway.replaceAll("_", " ")}: ${count}`).join(", ") || "No saved packets yet"}.
              </p>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">
                Briefcase items: {documentActivity.briefcaseItems}. Latest packet: {documentActivity.latestPacketDate ?? "None yet"}.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardLinkCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Card className="rounded-md p-5">
      <h2 className="text-lg font-black text-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">{body}</p>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal hover:text-navy">
        Open
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
