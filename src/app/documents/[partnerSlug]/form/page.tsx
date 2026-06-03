import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { DcMotionInformationForm } from "./DcMotionInformationForm";
import { IllinoisPetitionInformationForm } from "./IllinoisPetitionInformationForm";
import { MississippiPetitionInformationForm } from "./MississippiPetitionInformationForm";
import { PennsylvaniaPetitionInformationForm } from "./PennsylvaniaPetitionInformationForm";

export default async function MississippiPetitionInformationFormPage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const partner = await getPartnerRecordBySlug(partnerSlug);
  const sessionId = typeof search.session === "string" ? search.session : undefined;
  const session = sessionId ? await getRcapIntakeSession(sessionId) : undefined;
  const state = partner?.targetState ?? partner?.state;
  const isMississippi = state?.toLowerCase() === "mississippi" || state?.toUpperCase() === "MS";
  const isIllinois = state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
  const isDc = isDcState(state);
  const isPennsylvania = isPennsylvaniaState(state);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link href={`/documents/${partnerSlug}${sessionId ? `?session=${sessionId}` : ""}`} className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-navy">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to document path
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
            <Badge tone="blue">Your Briefcase</Badge>
            <h1 className="mt-4 text-3xl font-black leading-tight text-navy">{isPennsylvania ? "Pennsylvania record relief information" : isDc ? "DC record relief information" : isIllinois ? "Illinois form information" : "Mississippi petition information"}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              You can save this and come back later from your Briefcase. This prepares a draft packet, not a final legal filing.
            </p>
            <div className="mt-5 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
              <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
              <p className="text-sm leading-6 text-grayWilma-700">
                Your Briefcase keeps saved forms and draft packets in one place. Production sign-in protection is prepared as a foundation in this phase.
              </p>
            </div>
          </aside>

          {!partner ? (
            <Card className="rounded-md p-6">Partner not found.</Card>
          ) : !isMississippi && !isIllinois && !isDc && !isPennsylvania ? (
            <Card className="rounded-md p-6">Document generation for this state is not available yet.</Card>
          ) : !session || session.partnerSlug !== partnerSlug ? (
            <Card className="rounded-md p-6">
              <p className="text-sm leading-6 text-grayWilma-700">Please start Wilma intake first so we can connect this form to your saved answers.</p>
              <Link href={`/intake/${partnerSlug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white">
                Start Wilma intake
              </Link>
            </Card>
          ) : isPennsylvania ? (
            <PennsylvaniaPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : isIllinois ? (
            <IllinoisPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : isDc ? (
            <DcMotionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : (
            <MississippiPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          )}
        </section>
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
