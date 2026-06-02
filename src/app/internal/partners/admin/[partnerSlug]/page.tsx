import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, ExternalLink, FileText, Mail, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerEmailDeliveryConfig } from "@/lib/email/email-service";
import { getActivationReadiness, getPartnerEvents } from "@/lib/partners/activation";
import {
  getAssetStatusLabel,
  getOnboardingStatusLabel,
  getPaymentStatusLabel,
  getProgramTier,
  getProvisioningStatusLabel,
  getQualificationStatusLabel
} from "@/lib/partners/partner-service";
import { getPartnerEmailDeliveryRecords, getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { getNeedLabels } from "@/lib/partners/seed-partners";
import { internalAdmin, internalAdminEmails, internalProvisioningDetail } from "@/lib/partners/routes";
import type { PartnerAsset, PartnerEvent } from "@/lib/partners/types";
import { getPartnerIntakeActivitySummary } from "@/lib/rcap-intake/repository";
import { AdminActionPanel } from "./AdminActionPanel";

export default async function InternalPartnerAdminDetailPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const record = await getPartnerRecordBySlug(partnerSlug);

  if (!record) {
    return <PartnerNotFound partnerSlug={partnerSlug} />;
  }

  const tier = getProgramTier(record.programTier);
  const assets = Object.values(record.assets);
  const events = getPartnerEvents(record.partnerSlug);
  const readiness = getActivationReadiness(record.partnerSlug);
  const emailConfig = getPartnerEmailDeliveryConfig();
  const emailHistory = await getPartnerEmailDeliveryRecords(record.partnerSlug);
  const intakeActivity = await getPartnerIntakeActivitySummary(record.partnerSlug);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={internalAdmin()} className="text-sm font-semibold text-teal hover:text-navy">
            Back to partner admin
          </Link>
          <Link
            href={internalProvisioningDetail(record.partnerSlug)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
          >
            Open Provisioning Detail
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <Card className="rounded-md p-6">
            <Badge tone="orange">Internal LegalEase admin. Write-ready actions.</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{record.partnerName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">{record.programGoal}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Meta label="Contact" value={`${record.contactName} · ${record.contactEmail}`} />
              <Meta label="Primary contact" value={`${record.primaryContactName ?? record.contactName} · ${record.primaryContactEmail ?? record.contactEmail}`} />
              <Meta label="Organization type" value={record.organizationType.replaceAll("_", " ")} />
              <Meta label="Target geography" value={`${record.serviceArea ?? record.region}, ${record.targetState ?? record.state}`} />
              <Meta label="Estimated 90-day users" value={record.estimatedUsers90Days.toLocaleString()} />
              <Meta label="Monthly participants" value={(record.expectedMonthlyParticipants ?? 0).toLocaleString()} />
              <Meta label="Program tier" value={tier.name} />
              <Meta label="Assigned owner" value={record.assignedOwner} />
              <Meta label="Launch target" value={record.expectedLaunchDate ?? record.launchDateTarget} />
              <Meta label="Record-clearing needs" value={getNeedLabels(record.recordClearingNeeds).join(", ")} />
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Current activation state</h2>
            <div className="mt-4 grid gap-3">
              <StatusLine label="Qualification" value={getQualificationStatusLabel(record.qualificationStatus)} tone={record.qualificationStatus === "qualified" ? "teal" : "orange"} />
              <StatusLine label="Payment" value={getPaymentStatusLabel(record.paymentStatus)} tone={record.paymentStatus === "paid" ? "teal" : "orange"} />
              <StatusLine label="Provisioning" value={getProvisioningStatusLabel(record.provisioningStatus)} tone={record.provisioningStatus === "provisioned" ? "teal" : "blue"} />
              <StatusLine label="Onboarding" value={getOnboardingStatusLabel(record.onboardingStatus)} tone={record.onboardingStatus === "submitted" || record.onboardingStatus === "approved" ? "teal" : "blue"} />
              <StatusLine label="Launch readiness" value={readiness?.ready ? "Ready" : "Needs attention"} tone={readiness?.ready ? "teal" : "orange"} />
            </div>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">{record.complianceNotes}</p>
          </Card>
        </section>

        <div className="mt-8">
          <AdminActionPanel partnerSlug={record.partnerSlug} assets={assets} />
        </div>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageSquareText className="mt-1 h-5 w-5 text-teal" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-navy">RCAP Wilma intake activity</h2>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">
                Aggregate intake foundation metrics for this partner. Participant details stay out of the admin summary.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Meta label="Total sessions" value={intakeActivity.totalSessions.toLocaleString()} />
            <Meta label="Completed sessions" value={intakeActivity.completedSessions.toLocaleString()} />
            <Meta label="Needs review" value={intakeActivity.needsReviewSessions.toLocaleString()} />
            <Meta
              label="Latest intake"
              value={
                intakeActivity.latestIntakeDate
                  ? new Date(intakeActivity.latestIntakeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "No sessions yet"
              }
            />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {Object.entries(intakeActivity.pathwaySummaryCounts).length > 0 ? (
              Object.entries(intakeActivity.pathwaySummaryCounts).map(([signal, count]) => (
                <Meta key={signal} label={signal.replaceAll("_", " ")} value={count.toLocaleString()} />
              ))
            ) : (
              <p className="text-sm font-semibold text-grayWilma-600">No pathway summaries have been generated yet.</p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-5 w-5 text-teal" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-black text-navy">Email delivery</h2>
                <p className="mt-2 text-sm leading-6 text-grayWilma-700">
                  Preview partner email templates, record dry-runs, and review delivery history. Live sending is disabled
                  unless explicitly configured.
                </p>
              </div>
            </div>
            <Link
              href={internalAdminEmails(record.partnerSlug)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
            >
              Open Email Previews
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Meta label="Delivery mode" value={emailConfig.statusLabel.replaceAll("_", " ")} />
            <Meta label="Provider" value={emailConfig.provider} />
            <Meta label="Delivery records" value={emailHistory.length.toLocaleString()} />
          </div>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-navy">Onboarding submission</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Meta label="Organization name" value={record.organizationName ?? record.partnerName} />
            <Meta label="Program name" value={record.programName ?? "Not provided"} />
            <Meta label="Primary contact title" value={record.primaryContactTitle ?? "Not provided"} />
            <Meta label="Target county" value={record.targetCounty ?? "Not provided"} />
            <Meta label="Target city" value={record.targetCity ?? "Not provided"} />
            <Meta label="Expected launch" value={record.expectedLaunchDate ?? record.launchDateTarget} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <ReviewNote label="Audience" value={record.audienceDescription} />
            <ReviewNote label="Referral sources" value={record.referralSources} />
            <ReviewNote label="Branding notes" value={record.brandingNotes} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <OperationalSection
            icon={<ShieldCheck className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="Qualification review"
            lines={[
              `Status: ${getQualificationStatusLabel(record.qualificationStatus)}`,
              `Need profile: ${getNeedLabels(record.recordClearingNeeds).join(", ")}`,
              `Scope: ${tier.scope.join(", ")}`
            ]}
          />
          <OperationalSection
            icon={<CheckCircle2 className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="Payment status"
            lines={[
              `Status: ${getPaymentStatusLabel(record.paymentStatus)}`,
              "Stripe-confirmed payment opens onboarding.",
              "Stripe payment identifiers are recorded only by verified webhook confirmation."
            ]}
          />
          <OperationalSection
            icon={<CalendarDays className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="Provisioning status"
            lines={[
              `Status: ${getProvisioningStatusLabel(record.provisioningStatus)}`,
              `Target launch: ${record.launchDateTarget}`,
              `Owner: ${record.assignedOwner}`
            ]}
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-navy">Asset activation</h2>
              <p className="mt-2 text-sm text-grayWilma-700">Current partner assets and write-ready activation controls.</p>
            </div>
            <Badge tone="orange">Write-ready</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {assets.map((asset) => (
              <AssetAdminCard key={asset.key} asset={asset} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-md p-6">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="text-lg font-black text-navy">Launch readiness</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {readiness?.checks.map((check) => (
                <div key={check.id} className="flex flex-col gap-2 rounded-md bg-[#f7f8f6] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-navy">{check.label}</p>
                    <p className="mt-1 text-xs font-semibold text-grayWilma-600">{check.detail}</p>
                  </div>
                  <Badge tone={readinessTone(check.state)}>{readinessLabel(check.state)}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="text-lg font-black text-navy">Activation history</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Admin notes</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Internal notes are routed through the server-side write layer. They persist only when Supabase partner data
              is enabled and configured; fallback mode never writes to local data or browser storage.
            </p>
          </Card>
          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Safe production checklist</h2>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-grayWilma-800">
              <p>Auth and role checks before production access.</p>
              <p>Supabase write mutations with server-side service role handling only.</p>
              <p>Audit trail persistence for admin actions and internal notes when Supabase is configured.</p>
              <p>Stripe payment source of truth in a later phase.</p>
            </div>
          </Card>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-navy">Metrics</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4 lg:grid-cols-7">
            {Object.entries(record.metrics).map(([key, value]) => (
              <div key={key} className="rounded-md bg-[#f7f8f6] px-3 py-3">
                <p className="text-2xl font-black text-navy">{value}</p>
                <p className="mt-1 text-xs font-semibold capitalize text-grayWilma-600">{key.replace(/([A-Z])/g, " $1")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black capitalize text-navy">{value}</p>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "teal" | "blue" | "orange" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#f7f8f6] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function OperationalSection({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-black text-navy">{title}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-grayWilma-700">{line}</p>
        ))}
      </div>
    </Card>
  );
}

function ReviewNote({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">{label}</p>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">{value || "Not provided"}</p>
    </div>
  );
}

function AssetAdminCard({ asset }: { asset: PartnerAsset }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-navy">{asset.label}</h3>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">{asset.description}</p>
        </div>
        <Badge tone={assetTone(asset.status)}>{getAssetStatusLabel(asset.status)}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-grayWilma-700">
        <p><span className="font-bold text-navy">Owner:</span> {asset.owner}</p>
        <p><span className="font-bold text-navy">Next action:</span> {asset.nextAction}</p>
        {asset.route ? <p><span className="font-bold text-navy">Route:</span> {asset.route}</p> : null}
      </div>
      <p className="mt-4 text-xs font-semibold text-grayWilma-600">
        Asset readiness changes are submitted through the write-ready action panel and persist only in Supabase mode.
      </p>
    </Card>
  );
}

function EventRow({ event }: { event: PartnerEvent }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-3">
      <p className="text-sm font-black text-navy">{event.eventLabel}</p>
      <p className="mt-1 text-xs font-semibold text-grayWilma-600">
        {new Date(event.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

function PartnerNotFound({ partnerSlug }: { partnerSlug: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="orange">Internal admin</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            No partner record exists for <span className="font-bold text-navy">{partnerSlug}</span> in the current partner
            repository. Local seeded fallback remains available for demo-partner, we-must-vote, and fulton-county.
          </p>
          <Link
            href={internalAdmin()}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Back to Partner Admin
          </Link>
        </Card>
      </div>
    </main>
  );
}

function assetTone(status: PartnerAsset["status"]): "teal" | "blue" | "orange" | "neutral" {
  if (status === "active" || status === "ready") {
    return "teal";
  }

  if (status === "generating") {
    return "blue";
  }

  if (status === "pending") {
    return "orange";
  }

  return "neutral";
}

function readinessTone(state: string): "teal" | "blue" | "orange" | "neutral" {
  if (state === "ready") {
    return "teal";
  }

  if (state === "mock_only") {
    return "blue";
  }

  if (state === "needs_attention") {
    return "orange";
  }

  return "neutral";
}

function readinessLabel(state: string) {
  const labels: Record<string, string> = {
    ready: "Ready",
    needs_attention: "Needs attention",
    locked: "Locked",
    mock_only: "Mock-only"
  };

  return labels[state] ?? state;
}
