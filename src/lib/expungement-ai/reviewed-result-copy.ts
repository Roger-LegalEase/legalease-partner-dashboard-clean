import catalog from "@/lib/expungement-ai/frontend/reviewed-result-display-copy.json";

/** Exact display copy only. This never changes evaluator reasons, choices or route identity. */
export function reviewedResultText(english: string): { en: string; es: string } | null {
  const matches = catalog.entries.filter((entry) => entry.kind !== "route_display_label" && entry.originalEnglish === english);
  return matches.length === 1 ? { en: matches[0].en, es: matches[0].es } : null;
}

export function reviewedResultRouteLabel(jurisdiction: string | null | undefined, pathwayId: string | null | undefined, english: string): { en: string; es: string } | null {
  const matches = catalog.entries.filter((entry) => entry.kind === "route_display_label" && entry.jurisdiction === jurisdiction
    && entry.pathwayId === pathwayId && entry.originalEnglish === english);
  return matches.length === 1 ? { en: matches[0].en, es: matches[0].es } : null;
}
