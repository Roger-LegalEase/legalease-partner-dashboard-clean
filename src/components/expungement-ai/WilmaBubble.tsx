"use client";

import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

export function WilmaBubble({ context }: { context: WilmaPageContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const prompt = promptForContext(context);
  // Render-only mirror of the server-side kill-switch flag. In production Wilma's availability is
  // checked server-side on every request (`wilma_enabled`); this client flag only mirrors it so
  // the surface can show the graceful fallback. The frontend never enforces a Wilma guardrail.
  const wilmaEnabled = process.env.NEXT_PUBLIC_WILMA_ENABLED !== "false";

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans" data-wilma-surface={context}>
      {isOpen ? (
        <section className="mb-3 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[#ECEFF4] bg-white shadow-2xl" data-wilma-chat="open">
          <div className="flex items-center justify-between bg-[#0B1320] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Wilma</p>
              <p className="text-xs text-white/60">Guide, not a lawyer</p>
            </div>
            <button className="rounded-md px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)} type="button">
              Close
            </button>
          </div>
          <div className="space-y-3 p-4">
            {wilmaEnabled ? (
              <>
                <div className="rounded-xl bg-[#F7F3EC] p-3 text-sm leading-6 text-[#0B1320]">
                  {prompt} I can explain process steps in plain language. The screening tool decides the result.
                </div>
                {reported ? (
                  <p className="text-xs font-semibold text-[#5A6275]" data-wilma-report-response="true" role="status">
                    Reported, thank you. A reviewer will take a look.
                  </p>
                ) : (
                  <button
                    className="text-xs font-semibold text-[#00A99D]"
                    data-wilma-report-response="true"
                    type="button"
                    onClick={() => setReported(true)}
                  >
                    Report this response
                  </button>
                )}
                <div className="flex items-start gap-2 rounded-xl border border-[#ECEFF4] bg-[#FBFCFE] p-3 text-xs leading-5 text-[#5A6275]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" />
                  Wilma is a guide, not a lawyer. This is not legal advice.
                </div>
                <form className="flex gap-2">
                  <input
                    aria-label="Message Wilma"
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#ECEFF4] px-3 text-sm outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20"
                  />
                  <button aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF3B00] text-white" type="button">
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </>
            ) : (
              <div className="rounded-xl bg-[#F7F3EC] p-4 text-sm leading-6 text-[#0B1320]" data-wilma-kill-switch-fallback="true">
                Wilma is taking a quick break. The screening tool and your Briefcase still have what you need to keep going.
              </div>
            )}
          </div>
        </section>
      ) : null}
      <button
        aria-label="Ask Wilma"
        className="flex min-h-12 items-center gap-3 rounded-full border border-[#ECEFF4] bg-white py-2 pl-4 pr-2 text-sm font-bold text-[#0B1320] shadow-xl"
        data-wilma-bubble="true"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="hidden sm:inline">{wilmaEnabled ? prompt : "Wilma is resting"}</span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00A99D] text-white">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}

function promptForContext(context: WilmaPageContext) {
  const prompts: Record<WilmaPageContext, string> = {
    landing: "Want me to explain how this works?",
    pricing: "Want to know what is included?",
    start: "Want me to explain the screening?",
    check: "Want me to explain these questions?",
    results: "Want me to explain this result?",
    pay: "Want to know what's included?",
    "packet-ready": "Want help with next steps?",
    briefcase: "Want me to explain this matter status?"
  };

  return prompts[context];
}
