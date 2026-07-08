import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ListChecks, ShieldCheck, Scale } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import type { StateLandingData } from "@/lib/expungement-ai/state-landing/state-landing-data";

/**
 * Reusable, data-driven Expungement.ai state landing template. Every state renders through this
 * one component; all state-specific text comes from `data` (see state-landing-data.ts). Visual
 * language matches the rest of the consumer app: navy #0B1320 text, orange #FF3B00 primary CTA,
 * teal #00A99D accents, on the shell's warm #FBFAF7 background.
 */
export function StateLandingPage({ data }: { data: StateLandingData }) {
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="marketing">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-24 font-sans md:px-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D] shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {data.hero.eyebrow}
          </span>
          <h1 className="mt-5 text-[36px] font-extrabold leading-[1.06] text-[#0B1320] md:text-[56px]">
            {data.hero.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-[#5A6275]">{data.hero.sub}</p>
          <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={data.hero.ctaPrimaryHref}
              className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-[13px] bg-[#FF3B00] px-6 py-4 text-base font-bold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]"
            >
              {data.hero.ctaPrimaryLabel} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href={data.hero.ctaSecondaryHref}
              className="inline-flex min-h-14 items-center justify-center rounded-[13px] border border-[#D9DEE8] bg-white px-6 py-4 text-base font-bold text-[#0B1320]"
            >
              {data.hero.ctaSecondaryLabel}
            </Link>
          </div>
          <p className="mt-3 text-[13px] font-semibold">
            <Link className="text-[#0E9C8E] underline underline-offset-4" href={data.changeStateHref}>
              {data.changeStateLabel}
            </Link>
          </p>
        </section>

        {/* Trust / disclaimer strip */}
        <section className="mt-12 rounded-[20px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
          <ul className="grid gap-3 md:grid-cols-2">
            {data.trustBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[14px] leading-6 text-[#3B4353]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00A99D]" aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* State-specific routes */}
        <Section
          icon={<Scale className="h-5 w-5" aria-hidden="true" />}
          title={`Record-clearing in ${data.name}: ${data.displayTerm}`}
        >
          <p className="text-[15px] leading-7 text-[#5A6275]">{data.termBlurb}</p>
          <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.06em] text-[#8A93A6]">{data.routesIntro}</p>
          <ul className="mt-3 grid gap-2">
            {data.pathwayHighlights.map((route) => (
              <li key={route} className="flex items-start gap-3 rounded-[12px] border border-[#ECEFF4] bg-[#FBFAF7] px-4 py-3 text-[14px] leading-6 text-[#0B1320]">
                <span className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full bg-[#00A99D]" aria-hidden="true" />
                <span>{route}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Two-column: what we prepare / what you may still need */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card icon={<FileText className="h-5 w-5" aria-hidden="true" />} title="What Expungement.ai can prepare">
            <BulletList items={data.prepareItems} tone="teal" />
          </Card>
          <Card icon={<ListChecks className="h-5 w-5" aria-hidden="true" />} title="What you may still need">
            <BulletList items={data.mayNeedItems} tone="muted" />
          </Card>
        </div>

        {/* How it works */}
        <Section icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} title="How it works">
          <ol className="grid gap-3">
            {data.howItWorks.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[14px] leading-6 text-[#3B4353]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0B1320] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* FAQ */}
        <Section icon={<FileText className="h-5 w-5" aria-hidden="true" />} title={`${data.name} record-clearing FAQ`}>
          <div className="grid gap-3">
            {data.faq.map((item) => (
              <details key={item.q} className="group rounded-[12px] border border-[#ECEFF4] bg-white px-4 py-3">
                <summary className="cursor-pointer list-none text-[15px] font-bold text-[#0B1320] marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-2 text-[14px] leading-7 text-[#5A6275]">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Final CTA */}
        <section className="mt-12 rounded-[22px] bg-[#0B1320] px-6 py-10 text-center md:px-10">
          <h2 className="text-[26px] font-extrabold text-white md:text-[32px]">
            See whether a {data.name} path may be available.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-[#C3C9D6]">
            The free check takes about 3 minutes. No card, no account to start. You only see $50 if a self-help packet
            path may be available and you choose to continue.
          </p>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={data.hero.ctaPrimaryHref}
              className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-[13px] bg-[#FF3B00] px-6 py-4 text-base font-bold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]"
            >
              {data.hero.ctaPrimaryLabel} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href={data.changeStateHref}
              className="inline-flex min-h-14 items-center justify-center rounded-[13px] border border-white/25 px-6 py-4 text-base font-bold text-white"
            >
              Choose a different state
            </Link>
          </div>
          <p className="mt-4 text-[12.5px] text-[#8A93A6]">
            Self-help document preparation. Not a law firm, and not legal advice. The court or agency makes the final
            decision.
          </p>
        </section>
      </div>
    </ConsumerPageShell>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-[20px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
      <h2 className="flex items-center gap-3 text-[20px] font-extrabold text-[#0B1320]">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[20px] border border-[#ECEFF4] bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-3 text-[17px] font-extrabold text-[#0B1320]">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">{icon}</span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function BulletList({ items, tone }: { items: readonly string[]; tone: "teal" | "muted" }) {
  const dot = tone === "teal" ? "bg-[#00A99D]" : "bg-[#C3C9D6]";
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[14px] leading-6 text-[#3B4353]">
          <span className={`mt-2 h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
