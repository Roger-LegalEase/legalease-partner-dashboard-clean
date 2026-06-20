"use client";

import { Send } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

const WILMA_AVATAR_SRC = "/expungement-ai/wilma-avatar.png";

type WilmaMessage = {
  id: number;
  role: "user" | "guide";
  text: string;
};

export function WilmaBubble({
  context,
  currentQuestion
}: {
  context: WilmaPageContext;
  currentQuestion?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<WilmaMessage[]>([]);
  const prompt = promptForContext(context);
  const guideText = guideTextForContext(context, currentQuestion);
  const hasGuideAnswer = messages.some((item) => item.role === "guide");
  // Render-only mirror of the server-side kill-switch flag. In production Wilma's availability is
  // checked server-side on every request (`wilma_enabled`); this client flag only mirrors it so
  // the surface can show the graceful fallback. The frontend never enforces a Wilma guardrail.
  const wilmaEnabled = process.env.NEXT_PUBLIC_WILMA_ENABLED !== "false";
  const trimmedMessage = message.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedMessage) return;
    const nextId = Date.now();
    setMessages((current) => [
      ...current,
      { id: nextId, role: "user", text: trimmedMessage },
      {
        id: nextId + 1,
        role: "guide",
        text: guideText
      }
    ]);
    setMessage("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans" data-wilma-surface={context}>
      {isOpen ? (
        <section className="mb-3 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[#ECEFF4] bg-white shadow-2xl" data-wilma-chat="open">
          <div className="flex items-center justify-between bg-[#0B1320] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <Image
                alt="Wilma guide"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                height={40}
                src={WILMA_AVATAR_SRC}
                width={40}
              />
              <div>
                <p className="text-sm font-bold">Wilma</p>
                <p className="text-xs text-white/60">Guide</p>
              </div>
            </div>
            <button className="rounded-md px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)} type="button">
              Close
            </button>
          </div>
          <div className="space-y-3 p-3">
            {wilmaEnabled ? (
              <>
                {messages.length > 0 ? (
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1" aria-live="polite">
                    {messages.map((item) => (
                      <div
                        className={item.role === "user" ? "ml-8 rounded-xl bg-[#0B1320] px-3 py-2 text-sm leading-5 text-white" : "mr-8 rounded-xl bg-[#F7F3EC] px-3 py-2 text-sm leading-5 text-[#0B1320]"}
                        key={item.id}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F7F3EC] px-3 py-2 text-sm leading-5 text-[#0B1320]">
                    Need help? Ask Wilma to explain this in plain English.
                  </div>
                )}
                {reported && hasGuideAnswer ? (
                  <p className="text-xs font-semibold text-[#5A6275]" data-wilma-report-response="true" role="status">
                    Reported, thank you. A reviewer will take a look.
                  </p>
                ) : hasGuideAnswer ? (
                  <button
                    className="text-xs font-semibold text-[#00A99D]"
                    data-wilma-report-response="true"
                    type="button"
                    onClick={() => setReported(true)}
                  >
                    Report this response
                  </button>
                ) : null}
                <form className="flex gap-2" onSubmit={handleSubmit}>
                  <input
                    aria-label="Message Wilma"
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#ECEFF4] px-3 text-sm outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20"
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={currentQuestion ? "Ask Wilma about this question" : "Ask Wilma"}
                    value={message}
                  />
                  <button
                    aria-label="Send message"
                    className="grid h-10 w-10 place-items-center rounded-lg bg-[#FF3B00] text-white disabled:cursor-not-allowed disabled:bg-[#C7CDD8]"
                    disabled={!trimmedMessage}
                    type="submit"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
                <p className="text-[11px] leading-4 text-[#5A6275]">Wilma is a guide, not legal advice.</p>
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
        <Image
          alt="Wilma guide"
          className="h-9 w-9 rounded-full object-cover"
          height={36}
          src={WILMA_AVATAR_SRC}
          width={36}
        />
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

function guideTextForContext(context: WilmaPageContext, currentQuestion?: string) {
  if (currentQuestion) {
    return "Answer with the best information you have. If you are not sure, choose the unsure option when one is available. Wilma can explain wording, but the screening tool decides the result.";
  }

  const guidance: Record<WilmaPageContext, string> = {
    landing: "Start with the free screening. It covers all 50 states and DC. A packet or payment option only appears if the result and jurisdiction allow it.",
    pricing: "The screening is free. Payment is only shown for packet-ready results; guidance-only results still give next steps without checkout.",
    start: "The screening asks for facts the engine needs, then returns a plain-language result. It does not promise court approval.",
    check: "Answer each screening question as accurately as you can. The engine uses your answers to decide whether to show guidance, more questions, review, or a packet option.",
    results: "Read the result, reasons, and next steps. A payment button should appear only when the result says a packet is available.",
    pay: "Checkout is only for packet-ready matters. If your result was guidance-only or needs review, use the next steps instead of payment.",
    "packet-ready": "Review the packet checklist before filing. You file with the court yourself; Expungement.ai provides self-help documents and guidance.",
    briefcase: "Your Briefcase keeps saved results, guidance, packet status, and next steps in one place."
  };

  return guidance[context];
}
