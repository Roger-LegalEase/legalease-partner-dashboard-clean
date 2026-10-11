"use client";
/* eslint-disable @next/next/no-img-element -- Session-scoped, no-store assets must render directly rather than through a shared image cache. */
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { CoBrandedPagePreview, PagePreviewField } from "@/lib/partners/onboarding/artifact-generator";

/** Shared approved composition. Preview interaction never grants program access. */
export function CoBrandedPageView({ preview: sourcePreview, variant, logoSrc, heroSrc = null, ownershipReview = false,
  liveCtaHref = null }: {
  preview: CoBrandedPagePreview;
  variant: "desktop" | "mobile";
  logoSrc: string | null;
  heroSrc?: string | null;
  ownershipReview?: boolean;
  liveCtaHref?: string | null;
}) {
  const mobile = variant === "mobile";
  const PageHeading = liveCtaHref ? "h1" : "h2";
  const PageContent = liveCtaHref ? "main" : "div";
  const { locale, setLocale, text } = useLocalization();
  const spanishAvailable = (sourcePreview.spanishEnabled ?? sourcePreview.languageAvailability.value?.includes("Spanish")) && ["headline","subheadline","organizationDescription","primaryActionLabel","participantSupportCopy","serviceArea","targetAudience"].every(key=>Boolean(sourcePreview.spanish?.[key as keyof NonNullable<CoBrandedPagePreview["spanish"]>]));
  const es = locale === "es" && spanishAvailable;
  const preview = {...sourcePreview};
  if(es && sourcePreview.spanish) {for(const key of ["headline","subheadline","organizationDescription","primaryActionLabel","participantSupportCopy","serviceArea","targetAudience"] as const){const value=sourcePreview.spanish[key];if(value)preview[key]={...sourcePreview[key],value};}}
  const privacyHref = safePublicHref(preview.partnerPrivacyUrl?.value ?? null);
  const accessibilityHref = safePublicHref(preview.accessibilityUrl?.value ?? null);
  const ctaLabel = text(preview.primaryActionLabel.value ?? "") || (es ? "Comenzar gratis" : "Start free");
  const cta = liveCtaHref
    ? <a href={liveCtaHref} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#B94622] px-6 py-3 font-bold text-white focus-visible:ring-4 focus-visible:ring-teal">{ctaLabel}<span aria-hidden="true" className="ml-2">→</span></a>
    : <span aria-disabled="true" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#B94622] px-6 py-3 font-bold text-white">{ctaLabel}</span>;
  return <div className={`${mobile ? "w-[390px] max-w-full" : "w-full"} overflow-hidden rounded-xl bg-white text-[#071B33] shadow-sm`} data-preview-variant={variant} {...(ownershipReview ? {"data-content-ownership-review":"enabled"} : {})}>
    {ownershipReview ? <OwnershipLegend /> : null}
    {!liveCtaHref ? <p className="bg-[#EEF7F6] px-5 py-3 text-sm font-semibold">{es ? "Vista previa privada · El programa aún no está publicado" : "Private preview · This does not publish or start the program"}</p> : null}
    <OwnershipGroup enabled={ownershipReview} label="System derived" tone="slate">
      <header className="border-b border-[#E2E8EC] bg-white px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-4">
          {preview.showPartnerLogo && logoSrc ? <img width={150} height={48} src={logoSrc} alt={`${preview.publicName.value ?? "Partner"} logo`} className="h-12 w-auto max-w-[150px] object-contain" /> : null}
          <div><p className="text-lg font-extrabold">{preview.publicName.value || preview.programName.value}</p><p className="mt-1 text-xs font-semibold text-[#475A6E]">{preview.programName.value} · Powered by Expungement.ai</p></div>
        </div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#EEF7F6] px-4 py-2 text-xs font-bold text-[#0A6E77]">{es ? "Empiece con una evaluación gratuita" : "Free screening to start"}</span><div role="group" aria-label={es ? "Idioma de la página" : "Page language"} className="flex gap-1">{(["en", ...(spanishAvailable?["es" as const]:[])] as const).map(language => <button key={language} type="button" aria-pressed={locale === language} onClick={() => setLocale(language)} className="inline-flex min-h-11 items-center rounded-md border border-[#C6D5DE] px-3 text-sm font-bold focus-visible:ring-4 focus-visible:ring-teal">{language === "es" ? "Español" : "English"}</button>)}</div></div></div>
      </header>
    </OwnershipGroup>
    {preview.authorizedJurisdictions?.length ? <p className="border-b px-5 py-3 text-sm" data-authorized-jurisdictions={preview.authorizedJurisdictions.map(j=>j.code).join(",")}>{es ? "Jurisdicciones autorizadas para la evaluación" : "Authorized screening jurisdictions"}: {preview.authorizedJurisdictions.map(j=>j.name).join(", ")}</p> : null}
    <OwnershipGroup enabled={ownershipReview} label="Partner supplied" tone="teal">
      <PageContent>
        <section data-rcap-brand={!preview.showPartnerLogo ? "text" : undefined} className="relative overflow-hidden bg-[#071B33] text-white">
          <div className={`mx-auto grid max-w-6xl gap-8 px-5 py-12 md:px-8 ${mobile ? "" : "md:grid-cols-[1.2fr_1fr] md:items-center md:py-20"}`}>
            <div><p className="text-sm font-bold text-[#8AD8CF]">{preview.serviceArea.value}</p><FieldContent field={preview.headline}><PageHeading className={`${mobile ? "text-4xl" : "text-4xl md:text-5xl"} mt-5 font-extrabold leading-[1.08] tracking-tight`}>{preview.headline.value}</PageHeading></FieldContent>
              <FieldContent field={preview.subheadline}><p className="mt-6 max-w-xl text-lg leading-8 text-[#DFE8EE]">{preview.subheadline.value}</p></FieldContent><div className="mt-8">{cta}</div><p className="mt-4 text-sm text-[#DFE8EE]">{es ? "Sin cuenta para empezar. Sus respuestas permanecen privadas." : "No account required to start. Your answers remain private."}</p>
            </div>
            {heroSrc ? <img width={600} height={750} src={heroSrc} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover" /> : <div aria-hidden="true" className="flex aspect-square items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-[#0A6E77] to-[#132D4E] p-8"><div className="rounded-full border border-white/30 p-8"><svg viewBox="0 0 120 120" className="h-36 w-36 text-[#8AD8CF]"><path d="M60 8 104 25v32c0 25-19 43-44 55C35 100 16 82 16 57V25Z" fill="none" stroke="currentColor" strokeWidth="4"/><path d="m38 60 16 16 30-34" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg></div></div>}
          </div>
        </section>
        <section className={`mx-auto grid max-w-6xl gap-8 px-5 py-12 md:px-8 ${mobile ? "" : "md:grid-cols-2"}`}>
          <div className="space-y-6"><ContentBlock field={preview.organizationDescription} label={es ? "Acerca de la organización" : "About the organization"}/><ContentBlock field={preview.serviceArea} label={es ? "Área de servicio" : "Service area"}/><ContentBlock field={preview.targetAudience} label={es ? "A quién sirve este programa" : "Who this program serves"}/></div>
          <div className="rounded-xl bg-[#EEF7F6] p-6"><ContentBlock field={preview.participantSupportCopy} label={es ? "Cómo obtener ayuda" : "Getting help"}/><div className="mt-5"><ContentBlock field={preview.languageAvailability} label={es ? "Idiomas" : "Languages"}/></div><div className="mt-5"><SupportRoute preview={preview}/></div></div>
        </section>
        <section className="bg-[#F3F7FA] px-5 py-12 md:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-extrabold">{es ? "Pasos claros para continuar" : "Clear steps to move forward"}</h2><div className={`mt-8 grid gap-5 ${mobile ? "" : "md:grid-cols-3"}`}>{(es ? [["Explore sus opciones", "Responda preguntas claras para ver qué opciones de eliminación de antecedentes podrían estar disponibles."],["Guarde su resultado", "Cree su cuenta privada cuando desee guardar el resultado y continuar."],["Revise los próximos pasos", "Revise la información y las condiciones de su programa antes de generar un paquete compatible."]] : [["Explore your options", "Answer clear questions to see what record-clearing options may be available."],["Save your result", "Create your private account when you are ready to save the result and continue."],["Review next steps", "Review your information and your program terms before generating a supported packet."]]).map(([title,body],index)=><div key={title} className="rounded-xl border border-[#E2E8EC] bg-white p-6"><span className="font-extrabold text-[#0A6E77]">0{index+1}</span><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#475A6E]">{body}</p></div>)}</div></div></section>
        <section className="mx-auto max-w-6xl px-5 py-12 md:px-8"><h2 className="text-3xl font-extrabold">{es ? "Preguntas frecuentes" : "Common questions"}</h2><details className="mt-6 border-b border-[#E2E8EC] py-4"><summary className="min-h-11 cursor-pointer font-bold">{es ? "¿La evaluación garantiza un resultado legal?" : "Does screening guarantee a legal outcome?"}</summary><p className="mt-3 max-w-3xl text-sm leading-7">{es ? "No. Los resultados son preliminares y deben verificarse. LegalEase ofrece herramientas de autoayuda, no representación legal." : "No. Screening results are preliminary and must be verified. LegalEase provides self-help tools, not legal representation."}</p></details><details className="border-b border-[#E2E8EC] py-4"><summary className="min-h-11 cursor-pointer font-bold">{es ? "¿Quién puede ayudarme con el programa?" : "Who can help me with the program?"}</summary><div className="mt-3"><SupportRoute preview={preview}/><p className="mt-3 text-sm leading-7">{text(preview.legalEaseSupportRouting.value??"")}</p></div></details><div className="mt-8">{cta}</div></section>
      </PageContent>
    </OwnershipGroup>
    <OwnershipGroup enabled={ownershipReview} label="LegalEase controlled" tone="navy"><footer className="border-t border-[#E2E8EC] bg-[#F3F7FA] px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><p className="text-sm leading-7">{text(preview.legalEaseSupportRouting.value??"")}</p><div className={`mt-6 grid gap-6 ${mobile ? "" : "md:grid-cols-2"}`}>{preview.legalBlocks.map(block=><div key={block.category}><h3 className="text-sm font-bold">{es ? block.headingEs ?? block.heading : block.heading}</h3><p className="mt-2 text-sm leading-7 text-[#475A6E]">{es ? block.bodyEs ?? block.body : block.body}</p></div>)}</div><nav aria-label={es ? "Información del participante" : "Participant information"} className="mt-6 flex flex-wrap gap-5">{privacyHref ? <a className="inline-flex min-h-11 items-center font-bold text-[#0A6E77] underline" href={privacyHref} rel="noopener noreferrer">{es ? "Privacidad" : "Privacy"}</a> : null}{accessibilityHref ? <a className="inline-flex min-h-11 items-center font-bold text-[#0A6E77] underline" href={accessibilityHref} rel="noopener noreferrer">{es ? "Accesibilidad" : "Accessibility"}</a> : null}</nav>{preview.showPoweredBy ? <p className="mt-5 text-xs font-semibold">Powered by Expungement.ai</p> : null}</div></footer></OwnershipGroup>
  </div>;
}

function ContentBlock({
  label,
  field
}: {
  label: string;
  field: PagePreviewField;
}) {
  return (
    <FieldContent field={field}>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A6E77] [font-family:var(--font-rcap-mono)]">
          {label}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#071B33]">{field.value}</p>
      </div>
    </FieldContent>
  );
}

function SupportRoute({ preview }: { preview: CoBrandedPagePreview }) {
  const { locale } = useLocalization();
  const spanishAvailable = (preview.spanishEnabled ?? preview.languageAvailability.value?.includes("Spanish")) && ["headline","subheadline","organizationDescription","primaryActionLabel","participantSupportCopy","serviceArea","targetAudience"].every(key=>Boolean(preview.spanish?.[key as keyof NonNullable<CoBrandedPagePreview["spanish"]>]));
  const es = locale === "es" && spanishAvailable;
  if (!preview.supportEmail.value && !preview.supportPhone.value) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A6E77] [font-family:var(--font-rcap-mono)]">
        {es ? "Ayuda para participantes" : "Participant support"}
      </h3>
      {preview.supportEmail.value ? (
        <p className="mt-2 break-words text-sm leading-6 text-[#071B33]">
          <a className="inline-flex min-h-11 items-center underline" href={`mailto:${preview.supportEmail.value}`}>{es ? "Correo" : "Email"} {preview.supportEmail.value}</a>
        </p>
      ) : null}
      {preview.supportPhone.value ? (
        <p className="mt-1 text-sm leading-6 text-[#071B33]">
          <a className="inline-flex min-h-11 items-center underline" href={`tel:${preview.supportPhone.value.replace(/[^+0-9]/g, "")}`}>{es ? "Llame al" : "Call"} {preview.supportPhone.value}</a>
        </p>
      ) : null}
    </div>
  );
}

function FieldContent({
  field,
  children
}: {
  field: PagePreviewField;
  children: React.ReactNode;
}) {
  if (field.value === null) return null;
  return <>{children}</>;
}

function OwnershipLegend() {
  return (
    <aside
      aria-label="Content ownership review"
      className="border-b-2 border-[#071B33] bg-[#EEF7F6] px-5 py-4"
    >
      <p className="text-xs font-extrabold text-[#071B33]">
        Content ownership review
      </p>
      <p className="mt-1 text-xs leading-5 text-[#475A6E]">
        Partner supplied | LegalEase controlled | System derived
      </p>
    </aside>
  );
}

function OwnershipGroup({
  children,
  enabled,
  label,
  tone
}: {
  children: React.ReactNode;
  enabled: boolean;
  label: string;
  tone: "teal" | "navy" | "slate";
}) {
  if (!enabled) return <>{children}</>;
  const border =
    tone === "teal"
      ? "border-[#0A8E9A]"
      : tone === "navy"
        ? "border-[#071B33]"
        : "border-[#475A6E]";
  return (
    <section
      aria-label={label}
      className={`relative border-l-4 ${border}`}
      data-content-source={label.toLowerCase().replaceAll(" ", "_")}
    >
      <p className="bg-[#F7F4EE] px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </p>
      {children}
    </section>
  );
}

function safePublicHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
