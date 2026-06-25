"use client";

import { Send } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";

const WILMA_AVATAR_SRC = "/expungement-ai/wilma-avatar.png";
const WILMA_CHAT_ENDPOINT = "/api/expungement-ai/wilma/chat";
const WILMA_PUBLIC_CHAT_ENDPOINT = "/api/expungement-ai/wilma/public-chat";
// Invariant: this surface only renders Wilma's guidance/translation — it never decides
// eligibility or results. Wilma can explain wording, but the screening tool decides the result.
// Eligibility/advice/outcome are deferred server-side (guardWilmaResponse + the live system
// prompt) and to the screening tool; the client merely displays the route's `response`.
// Shown only when the request itself fails (network/transport). The route's own
// deterministic fallback arrives in `response` and is rendered as-is.
const WILMA_TRANSPORT_FALLBACK = "I had trouble reaching the assistant just now — give it another try in a moment. The screening tool and your Briefcase are still right here.";

// Lightweight state list for the anonymous landing picker. Selecting a state feeds verified
// state content into the public payload so legal-fact questions get real content, not a redirect.
const US_STATES: Array<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

type WilmaMessage = {
  id: number;
  role: "user" | "guide";
  text: string;
};

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

export function WilmaBubble({
  context,
  currentQuestion,
  state,
  briefcaseItemId,
  mode = "authenticated"
}: {
  context: WilmaPageContext;
  currentQuestion?: string;
  // Sent only when a specific case is in scope (briefcase/check surfaces). When absent the
  // POST body stays the byte-identical { message, pageContext, history }.
  state?: string;
  briefcaseItemId?: string;
  // "public" wires the anonymous landing endpoint: state picker, Turnstile, conversation id,
  // and NEVER briefcaseItemId. Defaults to the authenticated route (unchanged behavior).
  mode?: "authenticated" | "public";
}) {
  const isPublic = mode === "public";
  const [isOpen, setIsOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<WilmaMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedState, setSelectedState] = useState(state ?? "");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [conversationId] = useState(() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  });
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const prompt = promptForContext(context);
  const hasGuideAnswer = messages.some((item) => item.role === "guide");
  // Render-only mirror of the server-side kill-switch flag. In production Wilma's availability is
  // checked server-side on every request (`wilma_enabled`); this client flag only mirrors it so
  // the surface can show the graceful fallback. The frontend never enforces a Wilma guardrail.
  const wilmaEnabled = process.env.NEXT_PUBLIC_WILMA_ENABLED !== "false";
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const trimmedMessage = message.trim();

  // Load and render the Turnstile widget for the anonymous surface, when a site key is set.
  // With no site key (e.g. staging pre-launch), the token stays undefined and the server
  // treats the challenge as disabled.
  useEffect(() => {
    if (!isPublic || !siteKey || !isOpen) return;
    const node = turnstileRef.current;
    if (!node) return;
    let widgetId: string | undefined;
    let cancelled = false;

    const renderWidget = () => {
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (cancelled || !turnstile || !turnstileRef.current) return;
      widgetId = turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(undefined),
        "error-callback": () => setTurnstileToken(undefined)
      });
    };

    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) {
      renderWidget();
    } else if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      const timer = window.setInterval(() => {
        if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) {
          window.clearInterval(timer);
          renderWidget();
        }
      }, 200);
      return () => window.clearInterval(timer);
    }

    return () => {
      cancelled = true;
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (turnstile && widgetId) turnstile.remove(widgetId);
    };
  }, [isPublic, siteKey, isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedMessage || isSending) return;
    const userMessage = trimmedMessage;
    // Prior turns, oldest first, EXCLUDING the message we're about to send — exactly the
    // history shape the route accepts. Capture before appending the new user turn.
    const history = messages.map((item) => ({ role: item.role, text: item.text }));
    const nextId = Date.now();
    setMessages((current) => [...current, { id: nextId, role: "user", text: userMessage }]);
    setMessage("");
    setIsSending(true);
    try {
      const requestBody: {
        message: string;
        pageContext: WilmaPageContext;
        history: { role: "user" | "guide"; text: string }[];
        state?: string;
        briefcaseItemId?: string;
        conversationId?: string;
        turnstileToken?: string;
      } = { message: userMessage, pageContext: context, history };
      if (isPublic) {
        // Anonymous payload: state picker + conversation id + bot token. NEVER briefcaseItemId.
        if (selectedState) requestBody.state = selectedState;
        requestBody.conversationId = conversationId;
        if (turnstileToken) requestBody.turnstileToken = turnstileToken;
      } else {
        if (state) requestBody.state = state;
        if (briefcaseItemId) requestBody.briefcaseItemId = briefcaseItemId;
      }
      const res = await fetch(isPublic ? WILMA_PUBLIC_CHAT_ENDPOINT : WILMA_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json().catch(() => null) as { response?: string } | null;
      const replyText = typeof data?.response === "string" && data.response.trim()
        ? data.response
        : WILMA_TRANSPORT_FALLBACK;
      setMessages((current) => [...current, { id: nextId + 1, role: "guide", text: replyText }]);
    } catch {
      setMessages((current) => [...current, { id: nextId + 1, role: "guide", text: WILMA_TRANSPORT_FALLBACK }]);
    } finally {
      setIsSending(false);
    }
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
                {isPublic ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#5A6275]">
                    <span className="shrink-0">Your state</span>
                    <select
                      aria-label="Your state"
                      className="min-h-9 min-w-0 flex-1 rounded-lg border border-[#ECEFF4] px-2 text-sm text-[#0B1320] outline-none focus:border-[#00A99D]"
                      value={selectedState}
                      onChange={(event) => setSelectedState(event.target.value)}
                    >
                      <option value="">Select a state (optional)</option>
                      {US_STATES.map((item) => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
                {isPublic && siteKey ? <div ref={turnstileRef} className="min-h-[1px]" /> : null}
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
                    disabled={!trimmedMessage || isSending}
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
