import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";

/**
 * The CMS shell.
 *
 * NOINDEX IS NOT OPTIONAL. This is an internal admin surface; if a search engine ever indexed it,
 * draft and unpublished legal content would be discoverable. Every page under /internal/content
 * inherits this.
 *
 * The shell deliberately holds no data and performs no reads — authorization is enforced by each
 * page's resolveContentPageAccess() gate, before that page reads anything. A layout is the wrong
 * place for an authorization boundary (it does not re-run on every navigation the way a page does),
 * so it is not used as one here.
 */
export const metadata: Metadata = {
  title: "LegalEase Content",
  robots: { index: false, follow: false }
};

const NAV: { href: string; label: string; group: string }[] = [
  { href: "/internal/content", label: "Dashboard", group: "Overview" },
  { href: "/internal/content/articles", label: "Articles", group: "Content" },
  { href: "/internal/content/state-resources", label: "State resources", group: "Content" },
  { href: "/internal/content/partner-stories", label: "Partner stories", group: "Content" },
  { href: "/internal/content/testimonials", label: "Testimonials", group: "Content" },
  { href: "/internal/content/reviews", label: "Review queues", group: "Workflow" },
  { href: "/internal/content/scheduled", label: "Scheduled", group: "Workflow" },
  { href: "/internal/content/social", label: "Social queue", group: "Promotion" },
  { href: "/internal/content/media", label: "Media library", group: "Library" },
  { href: "/internal/content/authors", label: "Authors", group: "Library" },
  { href: "/internal/content/settings", label: "Settings", group: "Admin" }
];

export default function ContentAdminLayout({ children }: { children: ReactNode }) {
  const groups = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-cream text-navy">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <Link href="/internal/content" className="block">
            <p className="text-lg font-black leading-tight text-navy">LegalEase</p>
            <p className="text-xs font-bold uppercase tracking-widest text-orange">Content platform</p>
          </Link>

          <nav className="mt-5 space-y-4">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {group}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-md px-2 py-1.5 text-sm font-semibold text-navy transition hover:bg-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <p className="mt-6 rounded-md border border-slate-300 bg-white px-3 py-2 text-[11px] leading-4 text-slate-500">
            Internal tool. Not indexed, not public. Published content reaches Expungement.ai and the
            LegalEase Partner site.
          </p>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
