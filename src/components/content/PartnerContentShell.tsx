import type { ReactNode } from "react";
import Link from "next/link";
import { PARTNER_BRAND } from "@/components/content/brand";

/**
 * Chrome for the LegalEase Partner editorial surface (legaleasepartner.com/insights, /partner-stories,
 * /resources, /authors/*).
 *
 * The partner landing page itself is a self-contained static HTML file served by
 * src/app/partners/route.ts, so there is no existing React shell to reuse — this is the React-side
 * equivalent, and it deliberately looks like the partner brand (navy, 2px radii, uppercase eyebrows)
 * rather than the consumer brand (warm paper, 14px radii, orange).
 *
 * Nav links use internal /partners/* paths, which are passthrough on legaleasepartner.com and also
 * resolve in local dev; the editorial cross-links inside the page bodies use the public paths that
 * match their canonical URLs.
 */
export function PartnerContentShell({ children }: { children: ReactNode }) {
  const brand = PARTNER_BRAND;

  const navLinks = [
    { href: "/partners/insights", label: "Insights" },
    { href: "/partners/partner-stories", label: "Partner stories" },
    { href: "/partners/resources", label: "State resources" }
  ];

  return (
    <div className={brand.cls.page}>
      <header className="border-b border-[#DCDCE6] bg-white">
        <nav
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8"
          aria-label="Primary"
        >
          <Link
            href="/partners"
            className={`text-[17px] font-extrabold tracking-[-0.01em] text-[#101046] ${brand.cls.focus}`}
          >
            LegalEase <span className="text-[#1F8F88]">Partner</span>
          </Link>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[14px] font-bold text-[#54546B] transition hover:text-[#101046] ${brand.cls.focus}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={brand.ctas.primary.href}
              className={`inline-flex min-h-10 items-center justify-center rounded-[2px] bg-[#101046] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#F04800] ${brand.cls.focus}`}
            >
              {brand.ctas.primary.label}
            </Link>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#DCDCE6] bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
          <p className="text-[13px] leading-6 text-[#54546B]">
            LegalEase provides self-help document preparation for record clearing. LegalEase is not a law firm and does
            not provide legal advice or representation. The court or agency makes the final decision on every record.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold text-[#54546B]">
            <Link href="/partners/about" className={brand.cls.focus}>
              About
            </Link>
            <Link href="/partners/privacy" className={brand.cls.focus}>
              Privacy
            </Link>
            <Link href="/partners/terms" className={brand.cls.focus}>
              Terms
            </Link>
            <Link href="/partners/disclaimer" className={brand.cls.focus}>
              Disclaimer
            </Link>
            <Link href="/partners/accessibility" className={brand.cls.focus}>
              Accessibility
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
