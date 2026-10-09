"use client";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
export function PracticeNotice() {
  const {locale} = useLocalization();
  return <div role="note" className="border-b border-teal bg-teal/10 px-4 py-3 text-center font-bold">{locale === "es" ? "Práctica aislada · Solo información ficticia · Sin pagos, activación ni datos de participantes reales" : "Isolated practice · Fictional information only · No real payment, activation, or participant data"}</div>;
}
