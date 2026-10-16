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

export function reviewedResultRouteLabel(jurisdiction: string | null | undefined, pathwayId: string | null | undefined, english: string, reasonCodes: readonly string[] = []): { en: string; es: string } | null {
  const adopted = georgiaPardonDisplay(jurisdiction, pathwayId, english);
  if (adopted) return adopted;
  const matches = catalog.entries.filter((entry) => entry.kind === "route_display_label" && entry.jurisdiction === jurisdiction
    && entry.pathwayId === pathwayId && entry.originalEnglish === english);
  // One exact source-stage successor. Historical results keep their original
  // display; only the server's current factual-stage reason admits this pair.
  // A duplicate, missing predecessor or conflicting binding still fails closed.
  const successors = matches.filter(entry => entry.supersedesDisplayEntryId !== undefined || entry.requiredReasonCode !== undefined);
  if (successors.length === 1 && matches.length === 2) {
    const successor = successors[0];
    const predecessors = matches.filter(entry => entry.id === successor.supersedesDisplayEntryId
      && entry.supersedesDisplayEntryId === undefined && entry.requiredReasonCode === undefined);
    if (jurisdiction === "NY" && pathwayId === "automatic-non-conviction-sealing-under-cpl-160-50-160-55"
      && english === "Automatic non-conviction sealing under CPL 160.50 / 160.55"
      && successor.id === "NY16055-CURRENT-ROUTE-DISPLAY"
      && successor.supersedesDisplayEntryId === "NY-RESULT-LABEL-automatic-non-conviction-sealing-under-cpl-160-50-160-55-v1"
      && successor.requiredReasonCode === "ny.partial_seal_guidance" && predecessors.length === 1) {
      const selected = reasonCodes.includes(successor.requiredReasonCode) ? successor : predecessors[0];
      return { en: selected.en, es: selected.es };
    }
  }
  if (successors.length) return null;
  return matches.length === 1 ? { en: matches[0].en, es: matches[0].es } : null;
}
