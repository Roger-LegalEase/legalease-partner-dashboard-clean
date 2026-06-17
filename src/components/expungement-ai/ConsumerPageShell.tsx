import type { ReactNode } from "react";
import { ConsumerNav } from "@/components/expungement-ai/ConsumerNav";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

export function ConsumerPageShell({
  children,
  wilmaContext
}: {
  children: ReactNode;
  wilmaContext: WilmaPageContext;
}) {
  return (
    <main className="min-h-screen bg-[#F7F3EC] text-[#0B1320]">
      <ConsumerNav />
      {children}
      <WilmaBubble context={wilmaContext} />
    </main>
  );
}
