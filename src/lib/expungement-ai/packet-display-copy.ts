import "server-only";
import { reviewedResultRouteLabel } from "@/lib/expungement-ai/reviewed-result-copy";
import catalog from "@/lib/expungement-ai/frontend/reviewed-packet-display-copy.json";

/** Display metadata only: both the authoritative route and original text must match. */
export function packetDisplayCopy(
  kind: "route_label" | "expected_packet_component",
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined,
  english: string
): { en: string; es?: string } {
  if (!jurisdiction || !pathwayId) return { en: english };
  const reviewed = kind === "route_label" ? reviewedResultRouteLabel(jurisdiction, pathwayId, english) : null;
  if (reviewed) return reviewed;
  const routeKey = `${jurisdiction}:${pathwayId}`;
  const matches = catalog.entries.filter((entry) => entry.kind === kind
    && entry.english === english && entry.routeKeys.includes(routeKey));
  return matches.length === 1 ? { en: english, es: matches[0].spanish } : { en: english };
}
