import Link from "next/link";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MississippiPetitionPacketPreview } from "@/components/rcap/documents/mississippi/MississippiPetitionPacketPreview";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { partnerPublicPage } from "@/lib/partners/routes";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { generateMississippiPetitionDraft } from "@/lib/rcap/documents/mississippi/generator";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";

export default async function RcapDocumentsPage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    return <PartnerNotFound partnerSlug={partnerSlug} />;
  }

  const isWeMustVote = partnerSlug === "we-must-vote";
  const partnerName = isWeMustVote ? "We Must Vote" : partner?.organizationName || partner?.partnerName || "this partner";
  const serviceArea = isWeMustVote ? "Mississippi" : partner?.serviceArea || partner?.targetCounty || partner?.region || partner?.state || "the partner service area";
  const state = isWeMustVote ? "MS" : partner.targetState ?? partner.state;
  const isMississippi = state?.toLowerCase() === "mississippi" || state?.toUpperCase() === "MS";
  const isIllinois = state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
  const isDc = isDcState(state);
  const isPennsylvania = isPennsylvaniaState(state);
  const sessionId = typeof search.session === "string" ? search.session : undefined;
  const session = sessionId ? await getRcapIntakeSession(sessionId) : undefined;
  const packet = session && session.partnerSlug === partnerSlug && isMississippi ? buildPreviewPacket(session) : undefined;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link href={partnerPublicPage(partnerSlug)} className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-navy print:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to partner page
        </Link>

        <Card className="mt-6 w-full rounded-md p-6 md:p-8 print:hidden">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="blue">{isWeMustVote ? "Mississippi Expungement Workflow" : isPennsylvania ? "Pennsylvania document workflow" : isDc ? "DC document workflow" : isIllinois ? "Illinois document workflow" : "Mississippi document workflow"}</Badge>
              <h1 className="mt-4 text-4xl font-black leading-tight text-navy">
                {isWeMustVote ? "Review and prepare your Mississippi packet" : `Draft document preparation for ${partnerName}`}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-grayWilma-700">
                {isWeMustVote
                  ? "LegalEase uses your We Must Vote record review answers to prepare a draft Mississippi packet, filing next steps, fee summary, Confirm before filing checklist, and downloadable PDFs."
                  : "I can help turn what you shared into a draft packet. This is not a final legal filing yet, and it does not guarantee eligibility or outcomes."}
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-7 grid gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4 sm:grid-cols-2">
            <Meta label="Partner" value={partnerName} />
            <Meta label="Service area" value={serviceArea} />
            <Meta label="Document state" value={isPennsylvania ? "Pennsylvania" : isMississippi ? "Mississippi" : isIllinois ? "Illinois" : isDc ? "District of Columbia" : "Not available yet"} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-white p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            <p className="text-sm leading-6 text-grayWilma-700">
              This tool does not provide legal advice and does not guarantee eligibility or outcomes.
            </p>
          </div>

          {!isMississippi && !isIllinois && !isDc && !isPennsylvania ? (
            <p className="mt-6 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-grayWilma-800">
              This partner launch is limited to the Mississippi Expungement Workflow.
            </p>
          ) : !sessionId ? (
            <StartWithIntake partnerSlug={partnerSlug} />
          ) : !session || session.partnerSlug !== partnerSlug ? (
            <p className="mt-6 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-grayWilma-800">
              We could not find that intake session for this partner. Please start with Wilma intake first.
            </p>
          ) : (
            <Link
              href={`/documents/${partnerSlug}/form?session=${session.id}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
            >
              Continue to Mississippi petition form
            </Link>
          )}
        </Card>

        {packet ? (
          <div className="mt-6">
            <MississippiPetitionPacketPreview packet={packet} />
          </div>
        ) : null}
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

function StartWithIntake({ partnerSlug }: { partnerSlug: string }) {
  return (
    <div className="mt-6 rounded-md border border-grayWilma-200 bg-white p-4">
      <p className="text-sm leading-6 text-grayWilma-800">
        Start with Wilma intake so the document tool can use what you already shared. You can still start even if you do not have every paper in front of you.
      </p>
      <Link
        href={`/intake/${partnerSlug}`}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
      >
        Start Wilma intake
      </Link>
    </div>
  );
}

function PartnerNotFound({ partnerSlug }: { partnerSlug: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="orange">Mississippi documents</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">This document page does not match an active LegalEase partner record.</p>
          <p className="mt-5 text-xs text-grayWilma-600">Requested partner slug: {partnerSlug}</p>
        </Card>
      </div>
    </main>
  );
}

function isDcState(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "dc" || normalized === "d.c." || normalized === "district of columbia" || normalized === "washington, dc";
}

function isPennsylvaniaState(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "pa" || normalized === "pennsylvania";
}

function buildPreviewPacket(session: NonNullable<Awaited<ReturnType<typeof getRcapIntakeSession>>>): RcapDocumentPacket {
  const generated = generateMississippiPetitionDraft(session);
  return {
    id: crypto.randomUUID(),
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "MS",
    county: generated.fields.county,
    documentType: generated.documentType,
    pathway: generated.pathway,
    status: generated.status,
    petitionerFirstName: generated.fields.petitionerFirstName,
    petitionerLastName: generated.fields.petitionerLastName,
    courtCounty: generated.fields.courtCounty,
    courtType: generated.fields.courtType,
    causeNumber: generated.fields.causeNumber,
    charge: generated.fields.charge,
    needsRecordReview: generated.fields.needsRecordReview,
    hasCourtDocuments: generated.fields.hasCourtDocuments,
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    filingNextStepsPacket: generated.filingNextStepsPacket,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer
  };
}
