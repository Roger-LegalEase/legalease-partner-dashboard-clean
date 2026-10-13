import { georgiaPardonDisplay } from "@/lib/rcap-engine/georgia-pardon-facts";
import catalog from "@/lib/expungement-ai/frontend/reviewed-result-display-copy.json";

/** Exact display copy only. This never changes evaluator reasons, choices or route identity. */
export function reviewedResultText(english: string): { en: string; es: string } | null {
  const matches = catalog.entries.filter((entry) => entry.kind !== "route_display_label" && entry.originalEnglish === english);
  if (matches.length === 1) return { en: matches[0].en, es: matches[0].es };
  const dated = english.match(/^(.*) The source-specific waiting period runs until (\d{4}-\d{2}-\d{2})\.$/);
  if (!dated) return null;
  const prefixes = catalog.entries.filter(entry => entry.id.startsWith("MS-EXACT-TIMING-WAIT-") && entry.originalEnglish === dated[1]);
  return prefixes.length === 1 ? { en: english, es: `${prefixes[0].es} El período de espera específico de esta vía termina el ${dated[2]}.` } : null;
}

export function reviewedResultRouteLabel(jurisdiction: string | null | undefined, pathwayId: string | null | undefined, english: string): { en: string; es: string } | null {
  const adopted = georgiaPardonDisplay(jurisdiction, pathwayId, english);
  if (adopted) return adopted;
  const matches = catalog.entries.filter((entry) => entry.kind === "route_display_label" && entry.jurisdiction === jurisdiction
    && entry.pathwayId === pathwayId && entry.originalEnglish === english);
  return matches.length === 1 ? { en: matches[0].en, es: matches[0].es } : null;
}
