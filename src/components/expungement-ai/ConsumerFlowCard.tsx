import Link from "next/link";
import type { ReactNode } from "react";

export function ConsumerFlowCard({
  eyebrow,
  title,
  lead,
  children,
  wide = false
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-[680px]"} px-4 pb-24 pt-32 md:px-8`}>
      <div className="rounded-[20px] border border-[#E4E8EF] bg-white p-[30px] shadow-sm md:p-[38px]">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#0E9C8E]">{eyebrow}</p>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#0B1320] md:text-[42px]">{title}</h1>
        {lead ? <p className="mt-4 text-[17px] leading-[1.55] text-[#5A6275]">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function FlowButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[13px] bg-[#FF3B00] px-6 py-4 text-base font-bold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]" href={href}>
      {children}
    </Link>
  );
}
