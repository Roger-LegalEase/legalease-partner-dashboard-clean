import { randomUUID } from "node:crypto";
import { ProgramEntrySubmit } from "@/components/partners/onboarding/ProgramEntrySubmit";
import { ProgramEntryLanguage, ProgramEntryText } from "@/components/partners/onboarding/ProgramEntryLanguage";
import { clinicConsumerContinuation } from "@/lib/expungement-ai/claim/clinic-acquisition";
import { redirect } from "next/navigation";
import { FunnelBeacon } from "@/components/analytics/FunnelBeacon";
import {
  claimPartnerScreeningSessionWithCode,
  claimRcapPartnerScreeningSession,
  resolveRcapPartnerIntakeContext,
  type RcapPartnerIntakeContext
} from "@/lib/expungement-ai/rcap-partner-intake";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import {
  appendAttributionQuery,
  extractPartnerAttribution,
  readAttributionFromFormData
} from "@/lib/expungement-ai/partner-attribution";

// "Court approval is not guaranteed" covered the outcome but said nothing about
// eligibility, so a participant could read it as a promise that they qualify. This is the
// same wording the documents placeholder uses.
const UPL_DISCLAIMER =
  "Expungement.ai is not a law firm. This tool does not provide legal advice and does not guarantee eligibility or outcomes. Court approval is not guaranteed.";

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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const status = typeof search.status === "string" ? search.status : "";
  const requestId=randomUUID();
  // County / UTM / source attribution is optional; carry it through the account
  // round-trip and into the screening start so it is not dropped.
  const attribution = extractPartnerAttribution(search);
  const [context, auth] = await Promise.all([
    resolveRcapPartnerIntakeContext(partnerSlug, typeof search.jurisdiction === "string" ? search.jurisdiction : undefined),
    getRcapBriefcaseAuthState()
  ]);

  if (!context) {
    return (
      <PageShell>
        <InactiveLinkState />
      </PageShell>
    );
  }

  if (!context.jurisdiction) return <PageShell><section className="mx-auto max-w-2xl rounded-xl bg-white p-8" data-rcap-intake-partner={context.partnerSlug} data-rcap-access={context.accessMode} data-rcap-jurisdictions={context.jurisdictions.join(",")}>
    <CoBrandHeader organizationName={context.organizationName} logoUrl={context.logoUrl}/><ProgramEntryLanguage enabled={context.spanishEnabled}/>
    <h1 className="mt-6 text-2xl font-bold"><ProgramEntryText enabled={context.spanishEnabled} en="Choose where your record is located" es="Elija dónde se encuentra su expediente"/></h1>
    <p className="mt-3"><ProgramEntryText enabled={context.spanishEnabled} en="Each jurisdiction has its own screening and legal requirements." es="Cada jurisdicción tiene sus propios requisitos legales y de evaluación."/></p>
    <form className="mt-6" method="GET"><label className="block"><ProgramEntryText enabled={context.spanishEnabled} en="Screening jurisdiction" es="Jurisdicción de evaluación"/><select name="jurisdiction" required defaultValue="" className="mt-2 block min-h-11 w-full rounded border p-3"><option value="" disabled><ProgramEntryText enabled={context.spanishEnabled} en="Choose a jurisdiction" es="Elija una jurisdicción"/></option>{context.jurisdictions.map(code=><option key={code} value={code}>{stateName(code)}</option>)}</select></label>
    {Object.entries(attribution).map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}<button className="ml-3 rounded bg-navy p-3 text-white" type="submit"><ProgramEntryText enabled={context.spanishEnabled} en="Continue" es="Continuar"/></button></form>
  </section></PageShell>;
  if (status === "program-full") {
    return (
      <PageShell>
        <ProgramFullState spanishEnabled={context.spanishEnabled} organizationName={context.organizationName} logoUrl={context.logoUrl} consumerUrl={auth.userId ? clinicConsumerContinuation(auth.userId, context.jurisdiction, `partner:${context.partnerSlug}`) : `/expungement-ai/screening/${context.jurisdiction.toLowerCase()}`} />
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
  const serviceArea = context.jurisdictions.map(stateName).join(", ");
  const codeError = status.startsWith("code_") ? codeErrorMessage(status.slice("code_".length), context) : null;

  return (
    <PageShell>
      <FunnelBeacon
        event="partner_intake_started"
        meta={{ partner_slug: context.partnerSlug, state: context.jurisdiction, product_surface: "legalease_partner" }}
      />
      <section className="mx-auto w-full max-w-2xl" data-rcap-intake-partner={context.partnerSlug} data-rcap-access={context.accessMode} data-rcap-jurisdiction={context.jurisdiction} data-rcap-jurisdictions={context.jurisdictions.join(",")}>
        <CoBrandHeader organizationName={context.organizationName} logoUrl={context.logoUrl} /><ProgramEntryLanguage enabled={context.spanishEnabled}/>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-[#EFE9DD] bg-white/90 shadow-[0_30px_80px_-44px_rgba(11,19,32,0.40)] backdrop-blur">
          <div className="p-7 md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F7F4] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#0B5C54]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#00A99D]" />
              <ProgramEntryText enabled={context.spanishEnabled} en="Partner record-clearing access" es="Acceso a la eliminación de antecedentes"/>
            </span>

            <h1 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.01em] text-[#0B1320] md:text-[40px]">
              {context.organizationName} × LegalEase
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-7 text-[#475A6E] md:text-[16.5px]">
              <ProgramEntryText enabled={context.spanishEnabled} en={`Start your free ${state} screening. After your preliminary result, create an account or sign in to save it in your private Briefcase.`} es={`Comience su evaluación gratuita de ${state}. Después del resultado preliminar, cree una cuenta o inicie sesión para guardarlo en su Briefcase privado.`}/>
            </p>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              <TrustChip><ProgramEntryText enabled={context.spanishEnabled} en="Private screening" es="Evaluación privada"/></TrustChip>
              <TrustChip>{state}</TrustChip>
              <TrustChip tone="teal"><ProgramEntryText enabled={context.spanishEnabled} en="No payment required here" es="Aquí no se requiere pago"/></TrustChip>
              <TrustChip><ProgramEntryText enabled={context.spanishEnabled} en="Not legal advice" es="No es asesoría legal"/></TrustChip>
            </ul>

            <ProgramDetails
              partner={context.organizationName}
              program={programName}
              serviceArea={serviceArea}
              screeningState={state}
              spanishEnabled={context.spanishEnabled}
            />

            {context.accessMode === "open" ? (
                <form action={startRcapPartnerScreening} className="mt-8">
                  <input type="hidden" name="partnerSlug" value={context.partnerSlug} />
                  <input type="hidden" name="requestId" value={requestId} />
                  <input type="hidden" name="jurisdiction" value={context.jurisdiction} />
                  {Object.entries(attribution).map(([key, value]) => (
                    <input key={key} type="hidden" name={`attr_${key}`} value={value} />
                  ))}
                  <ProgramEntrySubmit spanishEnabled={context.spanishEnabled}/>
                  <p className="mt-3.5 max-w-lg text-[13.5px] leading-6 text-[#5A6275]">
                    <ProgramEntryText enabled={context.spanishEnabled} en="Screening is preliminary. Saving a result requires your own verified account; screening alone creates no matter, payment or packet entitlement." es="La evaluación es preliminar. Para guardar el resultado se requiere su propia cuenta verificada; la evaluación por sí sola no crea un asunto, pago ni derecho a un paquete."/>
                  </p>
                </form>
              ) : (
                <AccessCodeStartForm context={context} attribution={attribution} codeError={codeError} requestId={requestId}/>
            )}
          </div>

          <div className="border-t border-[#F0ECE3] bg-[#FBF8F2] px-7 py-4 md:px-10">
            <p className="text-[12px] leading-5 text-[#59667B]"><ProgramEntryText enabled={context.spanishEnabled} en={UPL_DISCLAIMER} es="Expungement.ai no es un bufete de abogados. Esta herramienta no ofrece asesoría legal ni garantiza elegibilidad o resultados. No se garantiza la aprobación del tribunal."/></p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

async function startRcapPartnerScreening(formData: FormData) {
  "use server";

  const partnerSlug = String(formData.get("partnerSlug") ?? "");
  const jurisdiction = String(formData.get("jurisdiction") ?? "");
  const requestId=String(formData.get("requestId")??"");
  const attribution = readAttributionFromFormData(formData);
  const result = await claimRcapPartnerScreeningSession({ partnerSlug, jurisdiction, requestId });

  if (result.ok) {
    redirect(
      appendAttributionQuery(
        `/expungement-ai/screening/${jurisdiction.toLowerCase()}?session=${result.sessionId}`,
        attribution
      )
    );
  }

  if (result.reason === "capacity_full") {
    redirect(appendAttributionQuery(`/intake/${encodeURIComponent(partnerSlug)}?jurisdiction=${encodeURIComponent(jurisdiction)}&status=program-full`, attribution));
  }

  redirect(`/intake/${encodeURIComponent(partnerSlug)}?status=inactive`);
}

async function startRcapPartnerScreeningWithCode(formData: FormData) {
  "use server";

  const partnerSlug = String(formData.get("partnerSlug") ?? "");
  const jurisdiction = String(formData.get("jurisdiction") ?? "");
  const requestId=String(formData.get("requestId")??"");
  const accessCode = String(formData.get("accessCode") ?? "");
  const attribution = readAttributionFromFormData(formData);

  // The server resolves attribution from the partner's access_mode + code.
  // The browser cannot assert partner benefit.
  const result = await claimPartnerScreeningSessionWithCode({ partnerSlug, jurisdiction, accessCode, requestId });

  if (result.ok) {
    redirect(
      appendAttributionQuery(
        `/expungement-ai/screening/${jurisdiction.toLowerCase()}?session=${result.sessionId}`,
        attribution
      )
    );
  }

  if (result.reason === "partner_inactive" || result.reason === "jurisdiction_not_authorized") {
    redirect(`/intake/${encodeURIComponent(partnerSlug)}?status=inactive`);
  }

  // Invalid / missing / expired / exhausted code: re-render intake with a clear
  // message and the standard-consumer escape hatch. No partner benefit granted.
  redirect(`/intake/${encodeURIComponent(partnerSlug)}?jurisdiction=${encodeURIComponent(jurisdiction)}&status=code_${result.reason}`);
}

type CodeError = { headline: string; body: string; headlineEs: string; bodyEs: string };

function codeErrorMessage(reason: string, context: RcapPartnerIntakeContext): CodeError {
  const partner = context.organizationName;
  if (reason === "code_required") {
    return {
      headline: "An access code is required",
      body: `${partner} requires a code for program entry. A code does not grant packet funding. You can enter a code to continue through their program, or continue through the standard Expungement.ai experience.`,
      headlineEs: "Se requiere un código de acceso",
      bodyEs: `${partner} requiere un código para acceder al programa. El código no otorga financiación para paquetes. Puede ingresar un código o continuar con la experiencia estándar de Expungement.ai.`
    };
  }
  const detail: Record<string, string> = {
    invalid: "That access code is not valid for this organization.",
    inactive: "That access code is not active right now.",
    expired: "That access code has expired.",
    exhausted: "That access code has already been used."
  };
  const detailEs: Record<string, string> = {
    invalid: "Este código no es válido para esta organización.", inactive: "Este código no está activo en este momento.",
    expired: "Este código ha vencido.", exhausted: "Este código ha alcanzado su límite de usos."
  };
  return {
    headline: "That access code did not work",
    body: `${detail[reason] ?? detail.invalid} Please check the code or continue through the standard Expungement.ai experience.`,
    headlineEs: "El código de acceso no funcionó",
    bodyEs: `${detailEs[reason] ?? detailEs.invalid} Revise el código o continúe con la experiencia estándar de Expungement.ai.`
  };
}

function AccessCodeStartForm({
  context,
  attribution,
  codeError,
  requestId
}: {
  context: RcapPartnerIntakeContext;
  attribution: Record<string, string>;
  codeError: CodeError | null;
  requestId:string;
}) {
  const required = context.accessMode === "required_code" || context.accessMode === "invite_only";
  const consumerHref = `/expungement-ai/screening/${context.jurisdiction.toLowerCase()}`;
  return (
    <div className="mt-8">
      {codeError ? (
        <div className="mb-5 rounded-[16px] border border-[#F3C9B8] bg-[#FDF1E8] p-4">
          <p className="text-[14px] font-black text-[#9A3412]" role="alert"><ProgramEntryText enabled={context.spanishEnabled} en={codeError.headline} es={codeError.headlineEs}/></p>
          <p className="mt-1.5 text-[13.5px] leading-6 text-[#7C3A1D]"><ProgramEntryText enabled={context.spanishEnabled} en={codeError.body} es={codeError.bodyEs}/></p>
        </div>
      ) : null}

      <form action={startRcapPartnerScreeningWithCode}>
        <input type="hidden" name="partnerSlug" value={context.partnerSlug} />
                  <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="jurisdiction" value={context.jurisdiction} />
        {Object.entries(attribution).map(([key, value]) => (
          <input key={key} type="hidden" name={`attr_${key}`} value={value} />
        ))}

        <label htmlFor="accessCode" className="block text-[14px] font-extrabold text-[#0B1320]">
          <ProgramEntryText enabled={context.spanishEnabled} en={`If you received an access code from ${context.organizationName}, enter it here.`} es={`Si recibió un código de acceso de ${context.organizationName}, ingréselo aquí.`}/>
        </label>
        <input
          id="accessCode"
          name="accessCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required={required}
          placeholder="Access code"
          className="mt-2.5 w-full rounded-[14px] border border-[#D7DEE8] bg-white px-4 py-3.5 text-[15px] font-bold uppercase tracking-[0.04em] text-[#0B1320] outline-none focus-visible:border-[#00A99D] focus-visible:ring-2 focus-visible:ring-[#00A99D] sm:max-w-[360px]"
        />

        <div className="mt-5">
          <ProgramEntrySubmit spanishEnabled={context.spanishEnabled} code/>

        </div>
      </form>

      {required ? (
        <p className="mt-4 text-[13.5px] leading-6 text-[#5A6275]">
          <ProgramEntryText enabled={context.spanishEnabled} en="Don’t have a code?" es="¿No tiene un código?"/>{" "}
          <a href={consumerHref} className="font-extrabold text-[#0B5C54] underline underline-offset-2">
            <ProgramEntryText enabled={context.spanishEnabled} en="Continue through the standard Expungement.ai experience" es="Continuar con la experiencia estándar de Expungement.ai"/>
          </a>
          .
        </p>
      ) : (
        <p className="mt-4 text-[13.5px] leading-6 text-[#5A6275]">
          <ProgramEntryText enabled={context.spanishEnabled} en={`You can start without a code, or enter one from ${context.organizationName} to join their program.`} es={`Puede comenzar sin un código o ingresar uno de ${context.organizationName} para unirse a su programa.`}/>
        </p>
      )}
    </div>
  );
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
        Expungement<span className="text-[#08786F]">.ai</span>
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
  screeningState,
  spanishEnabled
}: {
  partner: string;
  program: string;
  serviceArea: string;
  screeningState: string;
  spanishEnabled: boolean;
}) {
  const rows: Array<[string, string]> = [
    ["Partner", partner],
    ["Program", program],
    ["Authorized jurisdictions", serviceArea],
    ["Screening state", screeningState]
  ];
  return (
    <div className="mt-7 rounded-[20px] border border-[#EFE9DD] bg-[#FCFAF5] p-1.5">
      <p className="px-3.5 pb-1 pt-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.09em] text-[#6B625B]">
        <ProgramEntryText enabled={spanishEnabled} en="Program details" es="Detalles del programa"/>
      </p>
      <dl className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-white px-3.5 py-3 ring-1 ring-[#F0ECE3]">
            <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#59667B]"><ProgramEntryText enabled={spanishEnabled} en={label} es={{Partner:"Organización",Program:"Programa","Authorized jurisdictions":"Jurisdicciones autorizadas","Screening state":"Estado de evaluación"}[label] ?? label}/></dt>
            <dd className="mt-1 text-[14.5px] font-black text-[#0B1320]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProgramFullState({ organizationName, logoUrl, consumerUrl, spanishEnabled }: { organizationName: string; logoUrl: string | null; consumerUrl: string; spanishEnabled: boolean }) {
  return (
    <section className="mx-auto w-full max-w-lg">
      <CoBrandHeader organizationName={organizationName} logoUrl={logoUrl} />
      <ProgramEntryLanguage enabled={spanishEnabled}/>
      <div className="mt-6 rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-black"><ProgramEntryText enabled={spanishEnabled} en="This program has reached its screening capacity" es="Este programa ha alcanzado su capacidad de evaluación"/></h1>
        <p role="status" className="mt-4"><ProgramEntryText enabled={spanishEnabled} en="Ask the organization about availability, or continue with free screening through the standard consumer service. Program entry does not grant packet funding." es="Consulte a la organización sobre la disponibilidad o continúe con la evaluación gratuita del servicio estándar. El acceso al programa no otorga financiación para paquetes."/></p>
        <a href={consumerUrl} className="mt-6 inline-flex min-h-12 items-center rounded-md bg-[#0F1E3D] px-5 py-3 font-bold text-white"><ProgramEntryText enabled={spanishEnabled} en="Continue with standard consumer service" es="Continuar con el servicio estándar"/></a>
      </div>
    </section>
  );
}

function InactiveLinkState() {
  return (
    <section className="mx-auto w-full max-w-lg">
      <div className="flex items-center justify-center gap-2 text-center">
        <span className="text-[15px] font-black tracking-[-0.01em] text-[#0B1320]">
          Expungement<span className="text-[#08786F]">.ai</span>
        </span>
      </div>
      <ProgramEntryLanguage enabled/>
      <div className="mt-6 rounded-[28px] border border-[#EFE9DD] bg-white/90 p-8 text-center shadow-[0_30px_80px_-44px_rgba(11,19,32,0.40)] backdrop-blur md:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF2F7] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#475A6E]">
          <ProgramEntryText enabled en="Partner record-clearing access" es="Acceso a la eliminación de antecedentes"/>
        </span>
        <h1 className="mt-5 text-[26px] font-black leading-tight text-[#0B1320] md:text-[30px]">
          <ProgramEntryText enabled en="This link is not active right now" es="Este enlace no está activo en este momento"/>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[#475A6E]">
          <ProgramEntryText enabled en="The partner program link may be paused or unavailable. Please contact the organization that shared it with you." es="El enlace del programa puede estar pausado o no disponible. Comuníquese con la organización que lo compartió."/>
        </p>
        <a
          href="https://expungement.ai"
          className="mt-7 inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-[#B94622] px-6 py-3 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(255,59,0,0.28)] transition hover:bg-[#963718] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
        >
          <ProgramEntryText enabled en="Back to Expungement.ai" es="Volver a Expungement.ai"/>
        </a>
      </div>
    </section>
  );
}
