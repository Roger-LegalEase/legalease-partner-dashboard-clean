"use client";

/**
 * DEVELOPMENT-ONLY visual gallery of all nine result screens, rendered from static fixtures.
 *
 * These fixtures are illustrative shapes, NOT computed outcomes. This component must only ever be
 * reached from a route that is blocked in production (see the route guard). The normal screening
 * flow always goes through `evaluateScreening` (a fixed safe `needs_review` mock on this branch);
 * it never uses this gallery.
 */
import { RESULT_GALLERY } from "@/lib/expungement-ai/frontend/fixtures";
import { ScreeningResult } from "@/components/expungement-ai/screening/ScreeningResult";

const GALLERY_PROMPTS: Record<string, string> = {
  disposition_date: "When was the case disposed of, dismissed, completed, or discharged?",
  case_outcome: "What happened with the case?"
};

const noop = () => {};

export function ResultGallery() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 font-sans md:px-8">
      <div className="mb-6 rounded-xl border border-[#F4D9C7] bg-[#FDF1E8] px-4 py-3 text-sm font-semibold text-[#9A3412]">
        Development-only result gallery. These are static fixtures for visual QA, not real outcomes.
        This page is blocked in production builds.
      </div>
      <div className="grid gap-10">
        {RESULT_GALLERY.map((evaluation) => (
          <section key={evaluation.matterId}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#8A93A6]">
              {evaluation.resultCode}
              {evaluation.paymentAllowed ? " · paymentAllowed" : ""}
            </p>
            <ScreeningResult
              evaluation={evaluation}
              stateName="Illinois"
              questionPromptById={GALLERY_PROMPTS}
              onEditAnswers={noop}
              onPacketAction={noop}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
