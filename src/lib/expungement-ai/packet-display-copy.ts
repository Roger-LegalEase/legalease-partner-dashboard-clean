import "server-only";
import type { BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";
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
  const routeKey = `${jurisdiction}:${pathwayId}`;
  const matches = catalog.entries.filter((entry) => entry.kind === kind
    && entry.english === english && entry.routeKeys.includes(routeKey));
  if (matches.length === 1) return { en: english, es: matches[0].spanish };
  // Preserve the packet's existing reviewed wording when screening labels grow.
  const reviewed = matches.length === 0 && kind === "route_label"
    ? reviewedResultRouteLabel(jurisdiction, pathwayId, english) : null;
  return reviewed ?? { en: english };
}

/** Translate generated route titles only; preserve other titles exactly. */
export function packetMatterTitleCopy(item: Pick<BriefcasePresentationItem,
  "authorityStatus" | "title" | "pathwayLabel" | "jurisdiction" | "pathwayId"
>): { en: string; es?: string } {
  if (item.authorityStatus === "unavailable" || item.title !== item.pathwayLabel) {
    return { en: item.title };
  }
  return packetDisplayCopy("route_label", item.jurisdiction, item.pathwayId, item.title);
}
