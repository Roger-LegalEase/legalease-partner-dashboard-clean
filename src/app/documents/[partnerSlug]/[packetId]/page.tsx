import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DcDocumentPacketPreview } from "@/components/rcap/documents/dc/DcDocumentPacketPreview";
import { MississippiPetitionPacketPreview } from "@/components/rcap/documents/mississippi/MississippiPetitionPacketPreview";
import { IllinoisDocumentPacketPreview } from "@/components/rcap/documents/illinois/IllinoisDocumentPacketPreview";
import { PennsylvaniaDocumentPacketPreview } from "@/components/rcap/documents/pennsylvania/PennsylvaniaDocumentPacketPreview";
import { TexasHarrisDocumentPacketPreview } from "@/components/rcap/documents/texas-harris/TexasHarrisDocumentPacketPreview";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { getRcapDocumentPacket } from "@/lib/rcap/documents/mississippi/repository";

export default async function MississippiDocumentPacketPage({
  params
}: {
  params: Promise<{ partnerSlug: string; packetId: string }>;
}) {
  const { partnerSlug, packetId } = await params;
  const [partner, packet] = await Promise.all([getPartnerRecordBySlug(partnerSlug), getRcapDocumentPacket(packetId)]);

  if (!partner || !packet || packet.partnerSlug !== partnerSlug) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
          <Card className="w-full rounded-md p-6 text-center">
            <Badge tone="orange">Mississippi documents</Badge>
            <h1 className="mt-4 text-3xl font-black text-navy">Document packet not found</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">The requested packet is unavailable or does not belong to this partner.</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link href={`/documents/${partnerSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-navy print:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to documents
        </Link>
        <div className="mt-6 print:mt-0">
          {packet.state === "TX" ? <TexasHarrisDocumentPacketPreview packet={packet} /> : packet.state === "PA" ? <PennsylvaniaDocumentPacketPreview packet={packet} /> : packet.state === "DC" ? <DcDocumentPacketPreview packet={packet} /> : packet.state === "IL" ? <IllinoisDocumentPacketPreview packet={packet} /> : <MississippiPetitionPacketPreview packet={packet} />}
        </div>
      </div>
    </main>
  );
}
