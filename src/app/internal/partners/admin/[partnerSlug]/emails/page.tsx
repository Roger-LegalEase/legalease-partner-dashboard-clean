import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerEmailDeliveryConfig } from "@/lib/email/email-service";
import { partnerEmailTypeLabels, partnerEmailTypes } from "@/lib/email/email-types";
import { getPartnerEmailDeliveryRecords, getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { internalAdminDetail, internalAdminEmailPreview } from "@/lib/partners/routes";
import type { PartnerEmailDeliveryRecord } from "@/lib/partners/types";

export default async function InternalPartnerEmailsPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getPartnerRecordBySlug(partnerSlug);

  if (!partner) {
    return <EmailPageShell title="Partner not found" partnerSlug={partnerSlug} />;
  }

  const config = getPartnerEmailDeliveryConfig();
  const history = await getPartnerEmailDeliveryRecords(partner.partnerSlug);

  return (
    <EmailPageShell title={`${partner.partnerName} email delivery`} partnerSlug={partner.partnerSlug}>
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-md p-6">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-teal" aria-hidden="true" />
            <h2 className="text-lg font-black text-navy">Delivery mode</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <StatusLine label="Status" value={config.statusLabel.replaceAll("_", " ")} />
            <StatusLine label="Provider" value={config.provider} />
            <StatusLine label="From address" value={config.from ? "Configured" : "Not configured"} />
            <StatusLine label="Reply-to" value={config.replyTo ? "Configured" : "Not configured"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-grayWilma-700">
            Live sending stays disabled unless ENABLE_PARTNER_EMAIL_DELIVERY is true and the provider settings are configured.
          </p>
        </Card>

        <Card className="rounded-md p-6">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-teal" aria-hidden="true" />
            <h2 className="text-lg font-black text-navy">Available templates</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {partnerEmailTypes.map((emailType) => (
              <Link
                key={emailType}
                href={internalAdminEmailPreview(partner.partnerSlug, emailType)}
                className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-4 py-3 transition hover:border-teal hover:bg-white"
              >
                <p className="text-sm font-black text-navy">{partnerEmailTypeLabels[emailType]}</p>
                <p className="mt-1 text-xs font-semibold text-grayWilma-600">Preview and dry-run</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-navy">Delivery history</h2>
        <div className="mt-4 grid gap-3">
          {history.length > 0 ? history.map((record) => <HistoryRow key={record.id ?? `${record.emailType}-${record.createdAt}`} record={record} />) : (
            <p className="text-sm leading-6 text-grayWilma-700">No delivery records exist for this partner yet.</p>
          )}
        </div>
      </section>
    </EmailPageShell>
  );
}

function EmailPageShell({
  title,
  partnerSlug,
  children
}: {
  title: string;
  partnerSlug: string;
  children?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Link href={internalAdminDetail(partnerSlug)} className="text-sm font-semibold text-teal hover:text-navy">
          Back to partner admin
        </Link>
        <div className="mt-6">
          <Badge tone="blue">Internal email foundation</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{title}</h1>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#f7f8f6] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone="neutral">{value}</Badge>
    </div>
  );
}

function HistoryRow({ record }: { record: PartnerEmailDeliveryRecord }) {
  return (
    <div className="grid gap-2 rounded-md bg-[#f7f8f6] px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-sm font-black text-navy">{partnerEmailTypeLabels[record.emailType]}</p>
        <p className="mt-1 text-xs font-semibold text-grayWilma-600">
          {record.subject} · {record.recipientEmail}
        </p>
      </div>
      <Badge tone={record.status === "sent" || record.status === "dry_run" ? "teal" : record.status === "failed" ? "orange" : "neutral"}>
        {record.status.replaceAll("_", " ")}
      </Badge>
    </div>
  );
}
