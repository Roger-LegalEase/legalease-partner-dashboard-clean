import { redirect } from "next/navigation";
import {
  claimRcapPartnerScreeningSession,
  resolveRcapPartnerIntakeContext
} from "@/lib/expungement-ai/rcap-partner-intake";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

const UPL_DISCLAIMER =
  "Expungement.ai is not a law firm and does not provide legal advice. Court approval is not guaranteed.";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

function stateName(code: string) {
  return STATE_NAMES[code?.trim().toUpperCase()] ?? code;
}

export default async function RcapPartnerIntakePage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const status = typeof search.status === "string" ? search.status : "";
  const [context, auth] = await Promise.all([
    resolveRcapPartnerIntakeContext(partnerSlug),
    getRcapBriefcaseAuthState()
  ]);

  if (!context) {
    return (
      <PageShell>
        <InactiveLinkState />
      </PageShell>
    );
  }

  if (status === "program-full") {
    return (
      <PageShell>
        <ProgramFullState organizationName={context.organizationName} logoUrl={context.logoUrl} />
      </PageShell>
    );
  }

  if (status === "inactive") {
    return (
      <PageShell>
        <InactiveLinkState />
      </PageShell>
    );
  }

  const state = stateName(context.jurisdiction);
  const programName = context.programName ?? `${state} Expungement Workflow`;
  const serviceArea = context.serviceArea ?? state;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-2xl">
        <CoBrandHeader organizationName={context.organizationName} logoUrl={context.logoUrl} />

        <div className="mt-6 overflow-hidden rounded-[28px] border border-[#EFE9DD] bg-white/90 shadow-[0_30px_80px_-44px_rgba(11,19,32,0.40)] backdrop-blur">
          <div className="p-7 md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F7F4] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#0B5C54]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#00A99D]" />
              Partner record-clearing access
            </span>

            <h1 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.01em] text-[#0B1320] md:text-[40px]">
              {context.organizationName} × LegalEase
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-7 text-[#475A6E] md:text-[16.5px]">
              Create a free account to save your answers, access your Briefcase, and receive
              support through {context.organizationName}. Then start your {state} record-clearing screening.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              <TrustChip>Private screening</TrustChip>
              <TrustChip>{state}</TrustChip>
              <TrustChip tone="teal">No payment required here</TrustChip>
              <TrustChip>Not legal advice</TrustChip>
            </ul>

            <ProgramDetails
              partner={context.organizationName}
              program={programName}
              serviceArea={serviceArea}
              screeningState={state}
            />

            {auth.isAuthenticated ? (
              <form action={startRcapPartnerScreening} className="mt-8">
                <input type="hidden" name="partnerSlug" value={context.partnerSlug} />
                <input type="hidden" name="jurisdiction" value={context.jurisdiction} />
                <button
                  type="submit"
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#FF3B00] px-6 py-3.5 text-[16px] font-extrabold text-white shadow-[0_14px_34px_rgba(255,59,0,0.30)] transition hover:bg-[#E63500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2 sm:w-auto sm:min-w-[260px]"
                >
                  Start your record-clearing screening
                  <span aria-hidden="true">&rarr;</span>
                </button>
                <p className="mt-3.5 max-w-lg text-[13.5px] leading-6 text-[#5A6275]">
                  Your screening happens inside your account so your answers, result, next steps, and
                  Briefcase stay available even if no packet path is available right now.
                </p>
              </form>
            ) : (
              <AccountFirstActions partnerSlug={context.partnerSlug} />
            )}
          </div>

          <div className="border-t border-[#F0ECE3] bg-[#FBF8F2] px-7 py-4 md:px-10">
            <p className="text-[12px] leading-5 text-[#8A93A6]">{UPL_DISCLAIMER}</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function AccountFirstActions({ partnerSlug }: { partnerSlug: string }) {
  const next = `/intake/${encodeURIComponent(partnerSlug)}`;
  const createHref = `/expungement-ai/sign-in?mode=create&partner=${encodeURIComponent(partnerSlug)}&next=${encodeURIComponent(next)}`;
  const signInHref = `/expungement-ai/sign-in?mode=signin&partner=${encodeURIComponent(partnerSlug)}&next=${encodeURIComponent(next)}`;
  return (
    <div className="mt-8 rounded-[20px] border border-[#EFE9DD] bg-[#FCFAF5] p-4">
      <h2 className="text-[18px] font-black text-[#0B1320]">Create your free Briefcase</h2>
      <p className="mt-2 text-[14px] leading-6 text-[#475A6E]">
        Partner participants sign in before screening so their answers and next steps are saved.
        Creating an account, verifying email, and completing screening do not count against the partner packet cap.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={createHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] bg-[#FF3B00] px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_34px_rgba(255,59,0,0.30)] transition hover:bg-[#E63500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
        >
          Start your record-clearing screening
        </a>
        <a
          href={signInHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] border border-[#D7DEE8] bg-white px-6 py-3.5 text-[15px] font-extrabold text-[#0B1320] transition hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2"
        >
          Sign in to continue
        </a>
      </div>
    </div>
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

/** Full-page warm-cream shell with subtle teal/orange ambient accents. */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBF8F2] text-[#0B1320]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_-10%,rgba(0,169,157,0.12),transparent_60%),radial-gradient(40%_30%_at_100%_8%,rgba(255,59,0,0.07),transparent_60%)]"
      />
      <div className="flex min-h-screen items-center justify-center px-4 py-12 md:px-6 md:py-16">
        {children}
      </div>
    </main>
  );
}

function CoBrandHeader({ organizationName, logoUrl }: { organizationName: string; logoUrl: string | null }) {
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="max-h-9 max-w-[140px] rounded-md object-contain" />
      ) : (
        <span className="text-[15px] font-black tracking-[-0.01em] text-[#0B1320]">{organizationName}</span>
      )}
      <span aria-hidden="true" className="text-[15px] font-bold text-[#B9C2CF]">+</span>
      <span className="text-[15px] font-black tracking-[-0.01em] text-[#0B1320]">
        Expungement<span className="text-[#00A99D]">.ai</span>
      </span>
    </div>
  );
}

function TrustChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "teal" }) {
  const styles =
    tone === "teal"
      ? "bg-[#E7F7F4] text-[#0B5C54] ring-[#CDEDE8]"
      : "bg-white text-[#334155] ring-[#E7E1D5]";
  return (
    <li className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold ring-1 ${styles}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone === "teal" ? "bg-[#00A99D]" : "bg-[#94A3B8]"}`} />
      {children}
    </li>
  );
}

function ProgramDetails({
  partner,
  program,
  serviceArea,
  screeningState
}: {
  partner: string;
  program: string;
  serviceArea: string;
  screeningState: string;
}) {
  const rows: Array<[string, string]> = [
    ["Partner", partner],
    ["Program", program],
    ["Service area", serviceArea],
    ["Screening state", screeningState]
  ];
  return (
    <div className="mt-7 rounded-[20px] border border-[#EFE9DD] bg-[#FCFAF5] p-1.5">
      <p className="px-3.5 pb-1 pt-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.09em] text-[#9A8F79]">
        Program details
      </p>
      <dl className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-white px-3.5 py-3 ring-1 ring-[#F0ECE3]">
            <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9AA3B2]">{label}</dt>
            <dd className="mt-1 text-[14.5px] font-black text-[#0B1320]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProgramFullState({ organizationName, logoUrl }: { organizationName: string; logoUrl: string | null }) {
  return (
    <section className="mx-auto w-full max-w-lg">
      <CoBrandHeader organizationName={organizationName} logoUrl={logoUrl} />
      <div className="mt-6 rounded-[28px] border border-[#EFE9DD] bg-white/90 p-8 text-center shadow-[0_30px_80px_-44px_rgba(11,19,32,0.40)] backdrop-blur md:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#FDF1E8] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#9A3412]">
          Program update
        </span>
        <h1 className="mt-5 text-[26px] font-black leading-tight text-[#0B1320] md:text-[30px]">
          This program is currently full
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[#475A6E]">
          Please check back later or contact the organization that shared this link.
        </p>
      </div>
    </section>
  );
}

function InactiveLinkState() {
  return (
    <section className="mx-auto w-full max-w-lg">
      <div className="flex items-center justify-center gap-2 text-center">
        <span className="text-[15px] font-black tracking-[-0.01em] text-[#0B1320]">
          Expungement<span className="text-[#00A99D]">.ai</span>
        </span>
      </div>
      <div className="mt-6 rounded-[28px] border border-[#EFE9DD] bg-white/90 p-8 text-center shadow-[0_30px_80px_-44px_rgba(11,19,32,0.40)] backdrop-blur md:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF2F7] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#475A6E]">
          Partner record-clearing access
        </span>
        <h1 className="mt-5 text-[26px] font-black leading-tight text-[#0B1320] md:text-[30px]">
          This link is not active right now
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[#475A6E]">
          The partner program link may be paused or unavailable. Please contact the organization that
          shared it with you.
        </p>
        <a
          href="https://expungement.ai"
          className="mt-7 inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-[#FF3B00] px-6 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(255,59,0,0.28)] transition hover:bg-[#E63500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
        >
          Back to Expungement.ai
        </a>
      </div>
    </section>
  );
}
