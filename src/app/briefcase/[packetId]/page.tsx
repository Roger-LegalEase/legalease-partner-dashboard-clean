import Link from "next/link";
import { Download, ListChecks, MessageCircle } from "lucide-react";
import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession();
  const item = await getBriefcaseItem(auth.userId, packetId);
  const artifact = packetArtifactFor(item?.artifactRefs);
  const isGuidanceOnly = item?.status === "guidance_saved" || item?.resultCode === "guidance_only" || item?.packetType === "guidance_packet";

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <section className="rounded-md border border-[#ECEFF4] bg-white p-6">
        {item ? (
          <>
            <p className="text-xs font-bold uppercase text-[#00A99D]">{isGuidanceOnly ? "Guidance saved" : "Packet detail"}</p>
            <h1 className="mt-3 text-3xl font-extrabold">{item.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#5A6275]">{item.summary}</p>
            <div className="mt-5 grid gap-3 rounded-md bg-[#F7F3EC] p-4 text-sm text-[#5A6275] md:grid-cols-2">
              <p><span className="font-bold text-[#0B1320]">Jurisdiction:</span> {item.state}</p>
              <p><span className="font-bold text-[#0B1320]">Pathway:</span> {item.pathwayLabel ?? "Saved matter"}</p>
              {isGuidanceOnly ? (
                <p><span className="font-bold text-[#0B1320]">Documents:</span> Guidance only</p>
              ) : (
                <>
                  <p><span className="font-bold text-[#0B1320]">Payment:</span> {item.paymentStatus ?? "not_applicable"}</p>
                  <p><span className="font-bold text-[#0B1320]">Packet:</span> {item.packetStatus ?? "not_started"}</p>
                </>
              )}
              {artifact ? <p><span className="font-bold text-[#0B1320]">Generated:</span> {new Date(artifact.generatedAt).toLocaleString()}</p> : null}
              {item.receiptUrl ? <p><span className="font-bold text-[#0B1320]">Receipt:</span> {item.receiptUrl}</p> : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {artifact && !isGuidanceOnly ? (
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={artifact.downloadPath}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Download packet
                </Link>
              ) : null}
              {!isGuidanceOnly ? (
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase">
                  <ListChecks className="h-4 w-4" aria-hidden="true" /> Filing checklist
                </Link>
              ) : null}
              <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Technical support
              </Link>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" type="button">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps
              </button>
            </div>
            <div className="mt-6">
              <h2 className="text-lg font-extrabold">{isGuidanceOnly ? "Next steps" : "Filing checklist"}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
                {item.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase text-[#E0A93B]">Not found</p>
            <h1 className="mt-3 text-3xl font-extrabold">Packet not found</h1>
            <p className="mt-3 text-sm leading-6 text-[#5A6275]">This packet is not available in your Briefcase.</p>
            <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase">Open Briefcase</Link>
          </>
        )}
      </section>
    </BriefcaseShell>
  );
}

function packetArtifactFor(refs: Record<string, unknown> | undefined) {
  if (
    refs &&
    typeof refs.generatedAt === "string" &&
    typeof refs.downloadPath === "string" &&
    typeof refs.fileName === "string"
  ) {
    return refs as { generatedAt: string; downloadPath: string; fileName: string };
  }

  return null;
}
