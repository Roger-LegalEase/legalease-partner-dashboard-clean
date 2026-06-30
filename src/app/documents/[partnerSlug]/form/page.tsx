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
import { TexasHarrisPetitionInformationForm } from "./TexasHarrisPetitionInformationForm";

export default async function MississippiPetitionInformationFormPage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ session?: string | string[]; briefcaseItemId?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const partner = await getPartnerRecordBySlug(partnerSlug);
  const sessionId = typeof search.session === "string" ? search.session : undefined;
  const briefcaseItemId = typeof search.briefcaseItemId === "string" ? search.briefcaseItemId : undefined;
  const persistedSession = sessionId ? await getRcapIntakeSession(sessionId) : undefined;
  const isWeMustVote = partnerSlug === "we-must-vote";
  const state = isWeMustVote ? "MS" : partner?.targetState ?? partner?.state;
  const session = persistedSession ?? (briefcaseItemId && partner ? {
    id: "",
    partnerSlug,
    partnerId: partner.partnerId,
    status: "started" as const,
    currentStep: "understand_goal" as const,
    state,
    county: partner.targetCounty,
    legalDisclaimerAccepted: true
  } : undefined);
  const isMississippi = state?.toLowerCase() === "mississippi" || state?.toUpperCase() === "MS";
  const isIllinois = state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
  const isDc = isDcState(state);
  const isPennsylvania = isPennsylvaniaState(state);
  const isTexasHarris = isTexasHarrisState(state, partner?.targetCounty ?? session?.county);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link href={`/documents/${partnerSlug}${sessionId ? `?session=${sessionId}` : ""}`} className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-navy">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to document path
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
            <Badge tone="blue">{isWeMustVote ? "We Must Vote + LegalEase" : "Your Briefcase"}</Badge>
            <h1 className="mt-4 text-3xl font-black leading-tight text-navy">{isWeMustVote ? "Mississippi petition information" : isTexasHarris ? "Harris County Texas record relief information" : isPennsylvania ? "Pennsylvania record relief information" : isDc ? "DC record relief information" : isIllinois ? "Illinois form information" : "Mississippi petition information"}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              {isWeMustVote
                ? "Complete the Mississippi-specific details you know. You can save your progress, return from your Briefcase, and download packet PDFs after generation."
                : "You can save this and come back later from your Briefcase. This prepares a draft packet, not a final legal filing."}
            </p>
            <div className="mt-5 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
              <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
              <p className="text-sm leading-6 text-grayWilma-700">
                Your Briefcase keeps saved forms, generated packets, filing next steps, fee summaries, and PDF downloads in one place.
              </p>
            </div>
          </aside>

          {!partner ? (
            <Card className="rounded-md p-6">Partner not found.</Card>
          ) : !isMississippi && !isIllinois && !isDc && !isPennsylvania && !isTexasHarris ? (
            <Card className="rounded-md p-6">This partner launch is limited to the Mississippi Expungement Workflow.</Card>
          ) : !session || session.partnerSlug !== partnerSlug ? (
            <Card className="rounded-md p-6">
              <p className="text-sm leading-6 text-grayWilma-700">Please start Wilma intake first so we can connect this form to your saved answers.</p>
              <Link href={`/intake/${partnerSlug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white">
                Start Wilma intake
              </Link>
            </Card>
          ) : isTexasHarris ? (
            <TexasHarrisPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : isPennsylvania ? (
            <PennsylvaniaPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : isIllinois ? (
            <IllinoisPetitionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : isDc ? (
            <DcMotionInformationForm partnerSlug={partnerSlug} session={session} />
          ) : (
            <MississippiPetitionInformationForm partnerSlug={partnerSlug} session={session} consumerBriefcaseItemId={briefcaseItemId} />
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

function isTexasHarrisState(state?: string, county?: string) {
  const normalizedState = state?.trim().toLowerCase();
  const normalizedCounty = county?.trim().toLowerCase();
  return (normalizedState === "tx" || normalizedState === "texas") && (!normalizedCounty || normalizedCounty === "harris" || normalizedCounty === "harris county");
}
