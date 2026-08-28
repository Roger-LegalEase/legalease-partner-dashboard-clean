import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DcDocumentPacketPreview } from "@/components/rcap/documents/dc/DcDocumentPacketPreview";
import { MississippiPetitionPacketPreview } from "@/components/rcap/documents/mississippi/MississippiPetitionPacketPreview";
import { IllinoisDocumentPacketPreview } from "@/components/rcap/documents/illinois/IllinoisDocumentPacketPreview";
import { PennsylvaniaDocumentPacketPreview } from "@/components/rcap/documents/pennsylvania/PennsylvaniaDocumentPacketPreview";
import { TexasHarrisDocumentPacketPreview } from "@/components/rcap/documents/texas-harris/TexasHarrisDocumentPacketPreview";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/types";

/**
 * Which component renders a stored document packet, decided exhaustively.
 *
 * The two document pages each carried their own chain of `packet.state === …`
 * tests ending in a bare `else` that rendered the Mississippi petition. Every
 * state not named in the chain — forty-six of them — rendered a Mississippi
 * petition captioned for a Mississippi court. A participant in Ohio would have
 * been shown a document naming a Mississippi justice court and a Mississippi
 * cause number, and nothing in the page would have said anything was wrong.
 *
 * That is the hazard `packet-route-resolver` says in its own header it replaced:
 * "an unlisted jurisdiction silently fell through to the Mississippi template,
 * which meant a participant in a state we do not support could be handed
 * another state's petition." It was replaced for packet ROUTING and left
 * standing in component DISPATCH, which is the same defect one layer up.
 *
 * So the map is exhaustive and there is no default. An unknown state renders an
 * explicit unsupported panel; it never renders another state's filing.
 */
const RENDERERS = {
  TX: TexasHarrisDocumentPacketPreview,
  PA: PennsylvaniaDocumentPacketPreview,
  DC: DcDocumentPacketPreview,
  IL: IllinoisDocumentPacketPreview,
  MS: MississippiPetitionPacketPreview
} as const;

export type SupportedDocumentPacketState = keyof typeof RENDERERS;

export const SUPPORTED_DOCUMENT_PACKET_STATES = Object.keys(RENDERERS) as SupportedDocumentPacketState[];

/** The renderer for this state, or null. Null is an answer, not a gap. */
export function documentPacketRendererFor(state: string | null | undefined) {
  const code = String(state ?? "").trim().toUpperCase();
  return (RENDERERS as Record<string, (typeof RENDERERS)[SupportedDocumentPacketState] | undefined>)[code] ?? null;
}

export function UnsupportedDocumentPacketState({ state }: { state: string | null | undefined }) {
  const code = String(state ?? "").trim().toUpperCase() || "an unrecorded state";
  return (
    <Card className="w-full rounded-md p-6">
      <Badge tone="orange">Unsupported document state</Badge>
      <h1 className="mt-4 text-3xl font-black text-navy">This packet cannot be displayed here</h1>
      <p className="mt-3 text-sm leading-6 text-grayWilma-700">
        This document packet is recorded for {code}, and no document renderer is approved for that state.
        Nothing is shown rather than another state&rsquo;s filing.
      </p>
    </Card>
  );
}

/**
 * The single dispatch both document pages use. A page that renders a packet
 * must go through here, so a new page cannot reintroduce a default branch.
 */
export function DocumentPacketRenderer({ packet }: { packet: RcapDocumentPacket }) {
  const Renderer = documentPacketRendererFor(packet.state);
  if (!Renderer) return <UnsupportedDocumentPacketState state={packet.state} />;
  return <Renderer packet={packet} />;
}
