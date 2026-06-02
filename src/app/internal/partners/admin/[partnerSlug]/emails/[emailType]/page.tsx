import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerEmailDeliveryConfig } from "@/lib/email/email-service";
import { isPartnerEmailType, partnerEmailTypeLabels } from "@/lib/email/email-types";
import { getPartnerEmailRequiredInputs, renderPartnerEmailTemplate } from "@/lib/email/templates";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { internalAdminEmails } from "@/lib/partners/routes";
import { EmailDryRunButton } from "./EmailDryRunButton";

export default async function InternalPartnerEmailPreviewPage({
  params
}: {
  params: Promise<{ partnerSlug: string; emailType: string }>;
}) {
  const { partnerSlug, emailType } = await params;
  if (!isPartnerEmailType(emailType)) {
    notFound();
  }

  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    notFound();
  }

  const config = getPartnerEmailDeliveryConfig();
  const rendered = renderPartnerEmailTemplate({
    partner,
    emailType,
    appUrl: config.appUrl,
    internalNotificationsEmail: config.internalNotificationsEmail
  });

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link href={internalAdminEmails(partner.partnerSlug)} className="text-sm font-semibold text-teal hover:text-navy">
          Back to email templates
        </Link>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="blue">{partnerEmailTypeLabels[emailType]}</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{rendered.subject}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Delivery mode: {config.statusLabel.replaceAll("_", " ")}. Live email is disabled unless explicitly configured.
            </p>
          </div>
          <EmailDryRunButton partnerSlug={partner.partnerSlug} emailType={emailType} />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Recipient and inputs</h2>
            <div className="mt-4 grid gap-3">
              <Meta label="Recipient" value={`${rendered.recipientName} · ${rendered.recipientEmail || "Not configured"}`} />
              <Meta label="Provider" value={config.provider} />
              <Meta label="Status" value={config.statusLabel.replaceAll("_", " ")} />
            </div>
            <div className="mt-5">
              <p className="text-sm font-black text-navy">Required data</p>
              <div className="mt-2 grid gap-2">
                {getPartnerEmailRequiredInputs(emailType).map((input) => (
                  <p key={input} className="text-sm leading-6 text-grayWilma-700">{input}</p>
                ))}
              </div>
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Plain text</h2>
            <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-[#f7f8f6] p-4 text-sm leading-6 text-grayWilma-800">
              {rendered.text}
            </pre>
          </Card>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-navy">HTML preview</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-grayWilma-200" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        </section>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}
