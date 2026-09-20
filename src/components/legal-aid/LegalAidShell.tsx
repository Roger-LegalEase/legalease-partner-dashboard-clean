import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { LegalAidBranding } from "@/lib/legal-aid/branding";

// The frame for every legal-aid page: the partner's name and logo lead, and
// LegalEase stays a subordinate line in the footer. Colours come from the
// partner's branding and flow into Tailwind arbitrary values as CSS variables.

export function LegalAidShell({ branding, children, audience = "participant", maxWidth = "max-w-3xl" }: { branding: LegalAidBranding; children: ReactNode; audience?: "participant" | "staff"; maxWidth?: string }) {
  const style = { "--la-brand": branding.brand, "--la-brand-dark": branding.brandDark, "--la-soft": branding.accentSoft } as CSSProperties;
  return (
    <div style={style} className="min-h-screen bg-[#FBFAFC] text-[#1E1129]">
      <header className="border-b border-[#E8E1EE] bg-white">
        <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-4 px-4 py-4`}>
          <Link href={branding.homeHref} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- partner logos are static public assets */}
            {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.fullName} className="h-9 w-auto sm:h-11" /> : <span className="text-lg font-black text-[var(--la-brand-dark)]">{branding.name}</span>}
            <span className="sr-only">{branding.fullName}</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-bold">
            {audience === "participant" ? (
              <>
                <Link href={branding.clinicsHref} className="text-[var(--la-brand-dark)] hover:underline">Clinics</Link>
                <Link href={branding.continueHref} className="rounded-md bg-[var(--la-brand)] px-3 py-2 text-white hover:bg-[var(--la-brand-dark)]">My application</Link>
              </>
            ) : (
              <span className="rounded-md bg-[var(--la-soft)] px-3 py-2 text-[var(--la-brand-dark)]">{branding.name} clinic team</span>
            )}
          </nav>
        </div>
      </header>
      <main className={`mx-auto ${maxWidth} px-4 py-8 sm:py-10`}>{children}</main>
      <footer className="border-t border-[#E8E1EE] bg-white">
        <div className={`mx-auto ${maxWidth} px-4 py-6 text-sm text-[#5B4E66]`}>
          <p className="font-bold text-[#1E1129]">{branding.fullName}</p>
          {branding.contactPhone || branding.contactEmail ? (
            <p className="mt-1">Questions? {branding.contactPhone ? <a href={`tel:${branding.contactPhone.replace(/\D/g, "")}`} className="font-semibold text-[var(--la-brand-dark)]">{branding.contactPhone}</a> : null}{branding.contactPhone && branding.contactEmail ? " · " : ""}{branding.contactEmail ? <a href={`mailto:${branding.contactEmail}`} className="font-semibold text-[var(--la-brand-dark)]">{branding.contactEmail}</a> : null}</p>
          ) : null}
          <p className="mt-3 text-xs text-[#7A6E85]">Application technology provided by LegalEase. {branding.name} decides who it can help; this site does not give legal advice.</p>
        </div>
      </footer>
    </div>
  );
}

export function Panel({ title, eyebrow, children, tone = "plain" }: { title?: string; eyebrow?: string; children: ReactNode; tone?: "plain" | "brand" | "warn" }) {
  const border = tone === "brand" ? "border-[var(--la-brand)] bg-[var(--la-soft)]" : tone === "warn" ? "border-[#E6C9A8] bg-[#FFF8EE]" : "border-[#E8E1EE] bg-white";
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${border}`}>
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--la-brand)]">{eyebrow}</p> : null}
      {title ? <h2 className="mt-1 text-xl font-black text-[#1E1129]">{title}</h2> : null}
      <div className={title || eyebrow ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export const laInput = "mt-2 min-h-11 w-full rounded-md border border-[#CDC2D6] bg-white px-3 py-2 text-base font-normal text-[#1E1129] outline-none focus:border-[var(--la-brand)] focus:ring-2 focus:ring-[var(--la-brand)]/25";
export const laPrimary = "inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--la-brand)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--la-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50";
export const laSecondary = "inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--la-brand-dark)] bg-white px-5 py-2 text-sm font-bold text-[var(--la-brand-dark)] hover:bg-[var(--la-soft)] disabled:cursor-not-allowed disabled:opacity-50";
