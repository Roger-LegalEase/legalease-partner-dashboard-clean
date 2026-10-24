"use client";

import { useEffect, useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function SensitiveIdentifierField({ id, value, onChange, ariaLabelledBy, ariaDescribedBy, invalid }: {
  id: string; value: string; onChange: (value: string) => void;
  ariaLabelledBy: string; ariaDescribedBy?: string; invalid: boolean;
}) {
  const { locale } = useLocalization();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const hide = () => setRevealed(false);
    window.addEventListener("blur", hide); window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("blur", hide); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", hide); };
  }, []);
  return <div className="grid gap-2" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setRevealed(false); }}>
    <input id={id} type={revealed ? "text" : "password"} inputMode="numeric" autoComplete="off" spellCheck={false}
      className="min-h-12 rounded-xl border px-4 text-base focus-visible:outline focus-visible:outline-2"
      value={value} onChange={(event) => onChange(event.target.value)} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} aria-invalid={invalid || undefined} />
    <button type="button" className="min-h-11 justify-self-start underline" aria-controls={id} aria-pressed={revealed} onClick={() => setRevealed((visible) => !visible)}>{locale === "es" ? revealed ? "Ocultar número de Seguro Social" : "Mostrar número de Seguro Social" : revealed ? "Hide Social Security number" : "Show Social Security number"}</button>
  </div>;
}
