import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase, CalendarDays, CreditCard, FileText, FolderOpen, HelpCircle, MessageCircle, Settings } from "lucide-react";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";

const briefcaseLinks = [
  { href: "/briefcase", label: "Overview", icon: Briefcase },
  { href: "/briefcase/matters", label: "My Checks", icon: FolderOpen },
  { href: "/briefcase/documents", label: "My Packets", icon: FileText },
  { href: "/briefcase/reminders", label: "Reminders", icon: CalendarDays },
  { href: "/briefcase/payments", label: "Payments", icon: CreditCard },
  { href: "/expungement-ai/support", label: "Support", icon: HelpCircle },
  { href: "/briefcase/settings", label: "Settings", icon: Settings }
];

export function BriefcaseShell({
  children,
  userEmail
}: {
  children: ReactNode;
  userEmail?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F7F3EC] text-[#0B1320]">
      <div className="border-b border-[#ECEFF4] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link className="flex items-center gap-3 text-lg font-extrabold" href="/briefcase">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#00A99D] text-white">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            Briefcase
          </Link>
          <div className="flex items-center gap-3 text-sm font-semibold text-[#5A6275]">
            <Link href="/expungement-ai/check">New check</Link>
            <Link href="/expungement-ai/support">Support</Link>
            {userEmail ? <span className="hidden md:inline">{userEmail}</span> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-8">
        <aside className="rounded-md border border-[#ECEFF4] bg-white p-3">
          <nav className="grid gap-1">
            {briefcaseLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-[#5A6275] hover:bg-[#F7F3EC] hover:text-[#0B1320]" href={item.href}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <Link className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-[#5A6275] hover:bg-[#F7F3EC] hover:text-[#0B1320]" href="/briefcase#wilma-conversations">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Wilma Conversations
            </Link>
          </nav>
        </aside>
        {children}
      </div>
      <WilmaBubble context="briefcase" />
    </main>
  );
}
