// Pure builders for partner packet-builder links. Kept dependency-free so both
// the server packet-generation path and verifiers can import it. The partner
// slug is always the item's actual sponsoring partner, never hardcoded.

export function partnerPacketInformationActionPath(partnerSlug: string, briefcaseItemId: string): string {
  return `/documents/${encodeURIComponent(partnerSlug)}/form?briefcaseItemId=${encodeURIComponent(briefcaseItemId)}`;
}
