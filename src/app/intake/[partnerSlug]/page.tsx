import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Clock3, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { partnerPublicPage } from "@/lib/partners/routes";
import type { PartnerRecord } from "@/lib/partners/types";

export default async function RcapIntakePlaceholderPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getPartnerRecordBySlug(partnerSlug);

  return (
    <PlaceholderShell
      partnerSlug={partnerSlug}
      partner={partner}
      badge="RCAP Wilma intake"
      title="RCAP Wilma intake is being prepared."
      body="This partner intake route is reserved for the future RCAP Wilma eligibility chat. It does not collect sensitive user data yet and does not decide eligibility."
      icon={<MessageSquareText className="h-6 w-6" aria-hidden="true" />}
    />
  );
}

function PlaceholderShell({
  partnerSlug,
  partner,
  badge,
  title,
  body,
  icon
}: {
  partnerSlug: string;
  partner?: PartnerRecord;
  badge: string;
  title: string;
  body: string;
  icon: ReactNode;
}) {
  const partnerName = partner?.organizationName || partner?.partnerName || "this partner";
  const serviceArea = partner?.serviceArea || partner?.targetCounty || partner?.region || partner?.state || "the partner service area";
  const contactEmail = partner?.primaryContactEmail || partner?.contactEmail;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="blue">{badge}</Badge>
              <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-grayWilma-700">{body}</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
              {icon}
            </span>
          </div>

          <div className="mt-7 grid gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4 sm:grid-cols-2">
            <Meta label="Partner" value={partnerName} />
            <Meta label="Service area" value={serviceArea} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-white p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            <p className="text-sm leading-6 text-grayWilma-700">
              This tool does not provide legal advice and does not guarantee eligibility or outcomes.
            </p>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-white p-4">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
            <div>
              <p className="text-sm font-black text-navy">Check back soon</p>
              <p className="mt-1 text-sm leading-6 text-grayWilma-700">
                {contactEmail ? `Contact ${partnerName} at ${contactEmail} for next steps while this RCAP route is being prepared.` : "Contact the partner for next steps while this RCAP route is being prepared."}
              </p>
            </div>
          </div>

          <Link
            href={partnerPublicPage(partnerSlug)}
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to partner page
          </Link>
        </Card>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}
