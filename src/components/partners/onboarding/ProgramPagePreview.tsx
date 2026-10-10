"use client";

import { useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { CoBrandedPageView } from "./CoBrandedPageView";
import type { CoBrandedPagePreview } from "@/lib/partners/onboarding/artifact-generator";

export function ProgramPagePreview({ preview, logoSrc }: { preview: CoBrandedPagePreview; logoSrc: string | null }) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const { locale } = useLocalization();
  return <div>
    <div role="group" aria-label={locale === "es" ? "Tamaño de vista previa" : "Preview size"} className="mb-4 flex gap-2">
      {(["desktop", "mobile"] as const).map(size => <button key={size} type="button" aria-pressed={viewport === size} className="min-h-11 rounded border px-4 font-bold aria-pressed:bg-navy aria-pressed:text-white" onClick={() => setViewport(size)}>{size === "desktop" ? locale === "es" ? "Escritorio" : "Desktop" : locale === "es" ? "Móvil" : "Mobile"}</button>)}
    </div>
    <CoBrandedPageView preview={preview} variant={viewport} logoSrc={logoSrc} />
  </div>;
}
