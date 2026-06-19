import type { ReactNode } from "react";
import { ConsumerNav } from "@/components/expungement-ai/ConsumerNav";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

export function ConsumerPageShell({
  children,
  wilmaContext,
  showWilma = true
}: {
  children: ReactNode;
  wilmaContext: WilmaPageContext;
  showWilma?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0B1320]">
      <ConsumerNav />
      {children}
      {showWilma ? <WilmaBubble context={wilmaContext} /> : null}
    </main>
  );
}
