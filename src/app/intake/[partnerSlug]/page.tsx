import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  claimRcapPartnerScreeningSession,
  resolveRcapPartnerIntakeContext
} from "@/lib/expungement-ai/rcap-partner-intake";

const inactiveCopy = "This link isn't active right now.";
const programFullCopy = "This program is currently full. Please check back later or contact the organization that shared this link.";

export default async function RcapPartnerIntakePage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const status = typeof search.status === "string" ? search.status : "";
  const context = await resolveRcapPartnerIntakeContext(partnerSlug);

  if (!context) {
    return <InactiveLinkState />;
  }

  if (status === "program-full") {
    return <ProgramFullState partnerName={context.organizationName} logoUrl={context.logoUrl} />;
  }

  if (status === "inactive") {
    return <InactiveLinkState />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="blue">Record-clearing access</Badge>
              <h1 className="mt-4 text-3xl font-black leading-tight text-navy">{context.organizationName}</h1>
              <p className="mt-3 text-sm leading-6 text-grayWilma-700">
                Start a private Expungement.ai screening through this partner program.
              </p>
            </div>
            {context.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={context.logoUrl} alt="" className="max-h-16 max-w-40 rounded-md object-contain" />
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Meta label="Partner" value={context.partnerName} />
            <Meta label="Program" value={context.programName ?? "Record-clearing access"} />
            <Meta label="Service area" value={context.serviceArea ?? context.jurisdiction} />
            <Meta label="Screening state" value={context.jurisdiction} />
          </div>

          <form action={startRcapPartnerScreening} className="mt-7">
            <input type="hidden" name="partnerSlug" value={context.partnerSlug} />
            <input type="hidden" name="jurisdiction" value={context.jurisdiction} />
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-mid sm:w-auto"
            >
              Start screening
            </button>
          </form>
        </Card>
      </div>
    </main>
  );
}

async function startRcapPartnerScreening(formData: FormData) {
  "use server";

  const partnerSlug = String(formData.get("partnerSlug") ?? "");
  const jurisdiction = String(formData.get("jurisdiction") ?? "");
  const result = await claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction });

  if (result.ok) {
    redirect(`/expungement-ai/screening/${jurisdiction.toLowerCase()}?session=${result.sessionId}`);
  }

  if (result.reason === "capacity_full") {
    redirect(`/intake/${encodeURIComponent(partnerSlug)}?status=program-full`);
  }

  redirect(`/intake/${encodeURIComponent(partnerSlug)}?status=inactive`);
}

function ProgramFullState({ partnerName, logoUrl }: { partnerName: string; logoUrl: string | null }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mx-auto mb-5 max-h-16 max-w-40 rounded-md object-contain" />
          ) : null}
          <Badge tone="orange">{partnerName}</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Program full</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{programFullCopy}</p>
        </Card>
      </div>
    </main>
  );
}

function InactiveLinkState() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="orange">Record-clearing access</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Link inactive</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{inactiveCopy}</p>
        </Card>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}
