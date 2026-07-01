import Link from "next/link";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import { Bell, FileText, Layers, LayoutGrid, Plus, Settings, User } from "lucide-react";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export type BriefcaseNavKey = "briefcase" | "matters" | "documents" | "settings";

const PRIMARY_NAV: Array<{ key: BriefcaseNavKey; href: string; label: string; Icon: typeof LayoutGrid }> = [
  { key: "briefcase", href: "/briefcase", label: "Briefcase", Icon: LayoutGrid },
  { key: "matters", href: "/briefcase/matters", label: "My matters", Icon: Layers },
  { key: "documents", href: "/briefcase/documents", label: "Documents", Icon: FileText }
];

const ACCOUNT_NAV: Array<{ key: BriefcaseNavKey; href: string; label: string; Icon: typeof LayoutGrid }> = [
  { key: "settings", href: "/briefcase/settings#profile", label: "Profile", Icon: User },
  { key: "settings", href: "/briefcase/settings", label: "Settings", Icon: Settings }
];

function identity(email?: string) {
  if (!email) return { initials: "ME", name: "Your Briefcase", email: "" };
  const local = email.split("@")[0] ?? email;
  const tokens = local.split(/[._+\-]/).filter(Boolean);
  const initials = (tokens.length >= 2 ? `${tokens[0][0]}${tokens[1][0]}` : local.slice(0, 2)).toUpperCase();
  const name = tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ") || local;
  return { initials, name, email };
}

export function BriefcaseShell({
  children,
  userEmail,
  caseState,
  briefcaseItemId,
  breadcrumb,
  activeNav = "briefcase",
  showNewCheck = false
}: {
  children: ReactNode;
  userEmail?: string;
  // Passed only by the per-item briefcase page, so Wilma gets a case-aware payload
  // (state + briefcaseItemId). List/overview briefcase pages omit them and keep the
  // byte-identical { message, pageContext, history } body.
  caseState?: string;
  briefcaseItemId?: string;
  breadcrumb?: ReactNode;
  activeNav?: BriefcaseNavKey;
  showNewCheck?: boolean;
}) {
  const me = identity(userEmail);

  return (
    <div className={`${sora.className} min-h-screen bg-[#FBFCFE] text-[#1A1D26]`}>
      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#0B1326] p-4 text-white md:flex">
          <Link href="/briefcase" className="mb-7 flex items-center gap-2.5 px-1.5 text-[16px] font-bold text-white">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#00A99D] text-[11px] font-extrabold text-[#0B1326]">E</span>
            Expungement.ai
          </Link>

          <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-white/[0.05] p-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-gradient-to-br from-[#1B2B40] to-[#00A99D] text-[13px] font-bold text-white">
              {me.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{me.name}</p>
              {me.email ? <p className="truncate text-[11px] text-white/50">{me.email}</p> : null}
            </div>
          </div>

          <nav className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map(({ key, href, label, Icon }) => (
              <NavItem key={label} href={href} label={label} Icon={Icon} active={activeNav === key} />
            ))}
            <p className="mt-4 mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35"><LocalizedText k="briefcase.account" fallback="Account" /></p>
            {ACCOUNT_NAV.map(({ key, href, label, Icon }) => (
              <NavItem key={label} href={href} label={label} Icon={Icon} active={false && activeNav === key} />
            ))}
          </nav>

          <div className="mt-auto rounded-xl bg-white/[0.05] p-3.5">
            <p className="text-[12px] font-semibold text-white"><LocalizedText k="briefcase.stuck" fallback="Stuck on something?" /></p>
            <p className="mt-1 text-[11px] leading-5 text-white/55"><LocalizedText k="briefcase.wilma_help" fallback="Wilma can explain any step in plain language, anytime." /></p>
            <a
              href="#ask-wilma"
              className="mt-2.5 grid min-h-9 w-full place-items-center rounded-lg bg-[#FF3B00] text-[12px] font-semibold text-white"
            >
              <LocalizedText k="common.ask_wilma" fallback="Ask Wilma" />
            </a>
            <Link href="/expungement-ai/support" className="mt-2 block text-center text-[11px] font-medium text-white/45 hover:text-white/70">
              <LocalizedText k="briefcase.contact_support" fallback="Contact support" />
            </Link>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#ECEFF4] bg-[#FBFCFE] px-5 md:px-7">
            <div className="flex items-center gap-2.5">
              <Link href="/briefcase" className="grid h-7 w-7 place-items-center rounded-md bg-[#00A99D] text-[12px] font-extrabold text-white md:hidden">E</Link>
              <p className="text-[13px] text-[#8A93A6]">{breadcrumb ?? <b className="text-[#1A1D26]"><LocalizedText k="briefcase.label" fallback="Briefcase" /></b>}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-[#ECEFF4] bg-white text-[#8A93A6]">
                <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
              </span>
              {showNewCheck ? (
                <Link
                  href="/expungement-ai/check"
                  className="flex items-center gap-1.5 rounded-[9px] bg-[#FF3B00] px-4 py-2.5 text-[13px] font-semibold text-white"
                >
                  <Plus className="h-[15px] w-[15px]" aria-hidden="true" strokeWidth={2.4} /> <LocalizedText k="briefcase.new_check" fallback="New record check" />
                </Link>
              ) : null}
            </div>
          </header>

          <main className="flex-1 overflow-auto px-5 pb-24 pt-6 md:px-7 md:pb-7">{children}</main>
        </div>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#0B1326] md:hidden">
        {[...PRIMARY_NAV, { key: "settings" as const, href: "/briefcase/settings", label: "Settings", Icon: Settings }].map(
          ({ key, href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                activeNav === key ? "text-[#2BC4B6]" : "text-white/55"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <LocalizedText k={`briefcase.nav.${label.toLowerCase().replace(/\s+/g, "_")}`} fallback={label} />
            </Link>
          )
        )}
      </nav>

      <WilmaBubble context="briefcase" state={caseState} briefcaseItemId={briefcaseItemId} />
    </div>
  );
}

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: typeof LayoutGrid; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] ${
        active ? "bg-[#00A99D]/[0.16] font-semibold text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className={`h-[17px] w-[17px] ${active ? "text-[#2BC4B6]" : ""}`} aria-hidden="true" />
      <LocalizedText k={`briefcase.nav.${label.toLowerCase().replace(/\s+/g, "_")}`} fallback={label} />
    </Link>
  );
}
