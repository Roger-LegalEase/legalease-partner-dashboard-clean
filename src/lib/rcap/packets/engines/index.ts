// Top-level output engine dispatch.
//
// Three engines, selected by the component's declared renderer strategy. The
// switch is exhaustive over RendererStrategy, so adding a strategy without
// wiring an engine is a compile error rather than a silent fallback.

import { CustomPleadingRenderer } from "@/lib/rcap/packets/engines/custom-pleading";
import {
  AcroFormFillStrategy,
  CoordinateOverlayStrategy,
  OfficialPdfRenderer,
  UnsupportedPdfStrategy
} from "@/lib/rcap/packets/engines/official-pdf";
import { ProcessGuidanceRenderer } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketRenderer, RenderInput, RenderResult } from "@/lib/rcap/packets/engines/types";
import type { RendererStrategy } from "@/lib/rcap/packets/types";

export {
  CustomPleadingRenderer,
  OfficialPdfRenderer,
  ProcessGuidanceRenderer,
  AcroFormFillStrategy,
  CoordinateOverlayStrategy,
  UnsupportedPdfStrategy
};

export function rendererFor(strategy: RendererStrategy): PacketRenderer {
  switch (strategy) {
    case "custom_pleading":
      return CustomPleadingRenderer;
    case "acroform_fill":
      return AcroFormFillStrategy;
    case "coordinate_overlay":
      return CoordinateOverlayStrategy;
    case "process_guidance":
      return ProcessGuidanceRenderer;
    case "unsupported_pending_conversion":
      return UnsupportedPdfStrategy;
  }
}

export async function renderPacketComponent(input: RenderInput): Promise<RenderResult> {
  return rendererFor(input.component.rendererStrategy).render(input);
}
