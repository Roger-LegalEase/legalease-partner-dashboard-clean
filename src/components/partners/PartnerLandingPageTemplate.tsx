import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, HelpCircle, MapPin, ShieldCheck } from "lucide-react";

export type PartnerLandingPageTemplateProps = {
  partnerSlug: string;
  partnerName: string;
  organizationName: string;
  partnerLogoUrl?: string;
  legaleaseLogoUrl?: string;
  state: string;
  counties: string[];
  serviceArea: string;
  programName: string;
  programDescription: string;
  eyebrow: string;
  landingPageHeadline: string;
  landingPageSubheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  trustLine: string;
  trustChips: string[];
  heroImageUrl?: string;
  helpItems: LandingCardItem[];
  promiseItems: LandingCardItem[];
  quoteText: string;
  quoteAttribution: string;
  comparisonColumns: LandingComparisonColumn[];
  howItWorksSteps: LandingStep[];
  whatYouNeedItems: string[];
  faqItems: LandingFaqItem[];
  finalCtaHeadline: string;
  finalCtaBody: string;
  finalCtaImageUrl?: string;
  brandColor: string;
  accentColor: string;
};

export type LandingCardItem = {
  title: string;
  body: string;
  imageUrl?: string;
};

export type LandingComparisonColumn = {
  title: string;
  body: string;
  imageUrl?: string;
};

export type LandingStep = {
  title: string;
  body: string;
  imageUrl?: string;
};

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export function PartnerLandingPageTemplate(props: PartnerLandingPageTemplateProps) {
  const cssVars = {
    "--partner-brand": props.brandColor,
    "--partner-accent": props.accentColor
  } as CSSProperties;

  return (
    <main style={cssVars} className="min-h-screen bg-[#fbfaf6] text-[#18233f]">
      <header className="border-b border-[#e8e2d6] bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <LogoMark src={props.partnerLogoUrl} label={props.organizationName} fallback={props.organizationName.slice(0, 2).toUpperCase()} />
            <div>
              <p className="text-sm font-black text-[var(--partner-brand)]">{props.organizationName}</p>
              <div className="mt-1 flex items-center gap-2">
                <LogoMark src={props.legaleaseLogoUrl} label="LegalEase" fallback="LE" small />
                <p className="text-xs font-semibold text-[#6d7280]">Powered by LegalEase</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-black uppercase text-[#5d6472]">
            <a href="#promise" className="rounded-md px-2 py-1 hover:bg-[#f2eee5]">Promise</a>
            <a href="#how-it-works" className="rounded-md px-2 py-1 hover:bg-[#f2eee5]">How it works</a>
            <a href="#faq" className="rounded-md px-2 py-1 hover:bg-[#f2eee5]">FAQ</a>
            <Link href="/sign-in" className="rounded-md border border-[#d8d2c7] bg-white px-2 py-1 text-[#17213a] hover:bg-[#f2eee5]">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-14">
          <div>
            <p className="inline-flex rounded-md bg-[var(--partner-accent)]/10 px-3 py-1 text-xs font-black uppercase text-[var(--partner-brand)]">
              {props.eyebrow}
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#17213a] md:text-6xl">
              {props.landingPageHeadline}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5d6472]">{props.landingPageSubheadline}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={props.primaryCtaHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--partner-brand)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90">
                {props.primaryCtaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={props.secondaryCtaHref} className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d8d2c7] bg-white px-5 py-3 text-sm font-black text-[#17213a] transition hover:bg-[#f7f4ee]">
                {props.secondaryCtaLabel}
              </Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-[#5d6472]">{props.trustLine}</p>
            <p className="mt-3 text-sm leading-6 text-[#5d6472]">
              Create an account or sign in to save progress and return to your Briefcase.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {props.trustChips.map((chip) => (
                <span key={chip} className="rounded-md border border-[#e1dacd] bg-[#fbfaf6] px-3 py-1 text-xs font-bold text-[#4f596b]">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <VisualPanel src={props.heroImageUrl} title={props.programName} body={props.programDescription} large />
            <CountySelector state={props.state} counties={props.counties} serviceArea={props.serviceArea} />
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8e2d6] bg-[#f7f4ee]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-[var(--partner-brand)]">If you do not know where to start</p>
              <h2 className="mt-3 text-3xl font-black text-[#17213a]">Start with what you know.</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {props.helpItems.map((item) => (
                <InfoPanel key={item.title} item={item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="promise" className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <SectionHeading eyebrow="The promise" title="A clearer path for record-clearing support." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {props.promiseItems.map((item) => (
            <InfoPanel key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="bg-[var(--partner-brand)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center md:px-6">
          <p className="text-2xl font-black leading-9 md:text-3xl">&ldquo;{props.quoteText}&rdquo;</p>
          <p className="mt-4 text-sm font-bold opacity-85">{props.quoteAttribution}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <SectionHeading eyebrow="Compare your options" title={`Why ${props.organizationName} and LegalEase are working together.`} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {props.comparisonColumns.map((column) => (
            <InfoPanel key={column.title} item={column} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#e8e2d6] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <SectionHeading eyebrow="How it works" title="Three steps to the next clear action." />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {props.howItWorksSteps.map((step, index) => (
              <div key={step.title} className="rounded-md border border-[#e1dacd] bg-[#fbfaf6] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--partner-brand)] text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black text-[#17213a]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5d6472]">{step.body}</p>
                {step.imageUrl ? <VisualPanel src={step.imageUrl} title={step.title} compact /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <SectionHeading eyebrow="What you'll need" title="A few basics help us route you." />
          <div className="mt-6 grid gap-3">
            {props.whatYouNeedItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-[#e1dacd] bg-white p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--partner-brand)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[#4f596b]">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <VisualPanel src={props.finalCtaImageUrl} title="Guidance with a clear next step" body="The screening flow is built to help people move from uncertainty to a practical next action." large />
      </section>

      <section id="faq" className="border-y border-[#e8e2d6] bg-[#f7f4ee]">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions people ask before starting." />
          <div className="mt-6 grid gap-3">
            {props.faqItems.map((item) => (
              <details key={item.question} className="rounded-md border border-[#e1dacd] bg-white p-4">
                <summary className="cursor-pointer text-sm font-black text-[#17213a]">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-[#5d6472]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:px-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black text-[#17213a] md:text-4xl">{props.finalCtaHeadline}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5d6472]">{props.finalCtaBody}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-[#e1dacd] bg-[#fbfaf6] p-5">
            <Link href={props.primaryCtaHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--partner-brand)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90">
              {props.primaryCtaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="text-xs leading-5 text-[#6d7280]">LegalEase does not provide legal advice and does not guarantee eligibility, court acceptance, filing approval, or record-clearing outcomes.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function CountySelector({ state, counties, serviceArea }: { state: string; counties: string[]; serviceArea: string }) {
  return (
    <div className="rounded-md border border-[#e1dacd] bg-[#fbfaf6] p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-[var(--partner-brand)]" aria-hidden="true" />
        <p className="text-sm font-black text-[#17213a]">Find support in {serviceArea || state}</p>
      </div>
      <label className="mt-3 grid gap-2 text-xs font-bold uppercase text-[#6d7280]">
        County or service area
        <select className="min-h-11 rounded-md border border-[#d8d2c7] bg-white px-3 text-sm font-semibold normal-case text-[#17213a]">
          {counties.map((county) => (
            <option key={county}>{county}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-[var(--partner-brand)]">{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-[#17213a]">{title}</h2>
    </div>
  );
}

function InfoPanel({ item }: { item: LandingCardItem | LandingComparisonColumn }) {
  return (
    <div className="rounded-md border border-[#e1dacd] bg-white p-5">
      {item.imageUrl ? <VisualPanel src={item.imageUrl} title={item.title} compact /> : <FallbackIcon title={item.title} />}
      <h3 className="mt-4 text-lg font-black text-[#17213a]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5d6472]">{item.body}</p>
    </div>
  );
}

function LogoMark({ src, label, fallback, small = false }: { src?: string; label: string; fallback: string; small?: boolean }) {
  const sizeClass = small ? "h-6 w-6 text-[10px]" : "h-11 w-11 text-sm";

  if (!src) {
    return <span className={`flex items-center justify-center rounded-md bg-[var(--partner-brand)] font-black text-white ${sizeClass}`}>{fallback}</span>;
  }

  return (
    <span className={`flex items-center justify-center overflow-hidden rounded-md border border-[#e1dacd] bg-white ${sizeClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${label} logo`} className="h-full w-full object-contain" />
    </span>
  );
}

function VisualPanel({ src, title, body, compact = false, large = false }: { src?: string; title: string; body?: string; compact?: boolean; large?: boolean }) {
  if (src) {
    return (
      <div className={`overflow-hidden rounded-md border border-[#e1dacd] bg-white ${compact ? "mt-4 h-28" : large ? "h-72" : "h-48"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-[#e1dacd] bg-[linear-gradient(135deg,#fbfaf6,#f0eadf)] p-5 ${large ? "min-h-72" : ""}`}>
      <FallbackIcon title={title} />
      <p className="mt-4 text-lg font-black text-[#17213a]">{title}</p>
      {body ? <p className="mt-2 text-sm leading-6 text-[#5d6472]">{body}</p> : null}
    </div>
  );
}

function FallbackIcon({ title }: { title: string }) {
  const Icon = title.toLowerCase().includes("question") || title.toLowerCase().includes("sure") ? HelpCircle : title.toLowerCase().includes("need") ? ClipboardList : ShieldCheck;
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--partner-accent)]/15 text-[var(--partner-brand)]">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}
