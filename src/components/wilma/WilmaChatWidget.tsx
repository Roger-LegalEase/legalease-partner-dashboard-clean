"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type WilmaChatStatus =
  | "collecting_information"
  | "likely_eligible_for_document_prep"
  | "not_a_fit_for_this_service"
  | "needs_more_information"
  | "outside_supported_scope";

type WilmaDecision = {
  status: WilmaChatStatus;
  reasons: Array<{ code: string; message: string }>;
};

type WilmaChatApiResponse = {
  sessionId: string;
  assistantMessage: string;
  status: WilmaChatStatus;
  requiresEmailGate: boolean;
  allowPaidCta: boolean;
  emailCaptured: boolean;
  showEmailGate: boolean;
  showPaidCta: boolean;
  nextQuestion?: string;
  reasonCodes: string[];
};

type WilmaLeadApiResponse = {
  sessionId: string;
  emailCaptured: boolean;
  showEmailGate: boolean;
  showPaidCta: boolean;
};

type WilmaCheckoutApiResponse = {
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
  reason?: string;
};

type WilmaPublicConfig = {
  available: boolean;
  mode: "available" | "disabled" | "maintenance" | "killed" | "beta_only" | "rollout";
  allowedStates: string[];
  message?: string;
};

const allStates = [
  ["", "Select state"],
  ["IL", "Illinois"],
  ["PA", "Pennsylvania"],
  ["MD", "Maryland"],
  ["DC", "District of Columbia"],
  ["MS", "Mississippi"],
  ["TX", "Texas"]
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hi, I am Wilma. Pick the state for the record and tell me what happened."
  }
];

const postEmailResultMessage =
  "Based on what you shared, you may be a good fit for LegalEase's self-help petition-preparation service.\n\nFor $50, LegalEase can prepare your petition packet, best-practices guide, resources, and tracking workspace.";

type PendingResult = {
  assistantMessage: string;
  decision: WilmaDecision;
};

export function WilmaChatWidget() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("");
  const [input, setInput] = useState("");
  const [anonymousId] = useState(createAnonymousId);
  const [betaToken] = useState(readBetaToken);
  const [launchConfig, setLaunchConfig] = useState<WilmaPublicConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [decision, setDecision] = useState<WilmaDecision | null>(null);
  const [showPaidCta, setShowPaidCta] = useState(false);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCapturingLead, setIsCapturingLead] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ anonymousId });
    if (state) {
      params.set("state", state);
    }
    if (betaToken) {
      params.set("betaToken", betaToken);
    }

    fetch(`/api/wilma/config?${params.toString()}`, {
      headers: { "x-legalease-device-id": anonymousId }
    })
      .then((response) => response.json())
      .then((data: WilmaPublicConfig) => setLaunchConfig(data))
      .catch(() =>
        setLaunchConfig({
          available: false,
          mode: "disabled",
          allowedStates: [],
          message: "Wilma is not available right now. Please check back soon."
        })
      );
  }, [anonymousId, betaToken, state]);

  const visibleStates = useMemo(() => {
    const allowed = new Set(launchConfig?.allowedStates ?? allStates.map(([value]) => value).filter(Boolean));
    return allStates.filter(([value]) => !value || allowed.has(value));
  }, [launchConfig]);

  const canSend = useMemo(
    () => Boolean(launchConfig?.available) && state.length > 0 && input.trim().length > 0 && !isSending && !pendingResult,
    [input, isSending, launchConfig?.available, pendingResult, state]
  );

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: "user", content: userMessage }
    ]);

    try {
      const response = await fetch("/api/wilma/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-legalease-device-id": anonymousId
        },
        body: JSON.stringify({
          anonymousId,
          deviceId: anonymousId,
          message: userMessage,
          sessionId,
          state,
          betaToken
        })
      });
      const data = (await response.json()) as Partial<WilmaChatApiResponse> & { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Wilma could not respond.");
      }

      setSessionId(data.sessionId);
      const nextDecision = toDecision(data.status, data.reasonCodes ?? []);
      setShowPaidCta(Boolean(data.showPaidCta));
      if (data.showEmailGate && nextDecision) {
        setPendingResult({
          decision: nextDecision,
          assistantMessage: data.assistantMessage ?? "Wilma has an eligibility result ready."
        });
      } else {
        setDecision(nextDecision);
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.assistantMessage ?? "Thanks. Wilma saved your answer."
          }
        ]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Wilma could not respond.");
    } finally {
      setIsSending(false);
    }
  }

  async function revealPendingResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingResult || !email.trim() || !consent || isCapturingLead) {
      return;
    }

    setError(null);
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setIsCapturingLead(true);

    try {
      const response = await fetch("/api/wilma/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-legalease-device-id": anonymousId
        },
        body: JSON.stringify({
          email,
          consent,
          sessionId,
          deviceId: anonymousId
        })
      });
      const data = (await response.json().catch(() => ({}))) as Partial<WilmaLeadApiResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Wilma could not save your email.");
      }

      setDecision(pendingResult.decision);
      setShowPaidCta(Boolean(data.showPaidCta));
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: postEmailResultMessage
        }
      ]);
      setPendingResult(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Wilma could not save your email.");
    } finally {
      setIsCapturingLead(false);
    }
  }

  async function startCheckout() {
    if (!sessionId || isStartingCheckout) {
      return;
    }

    setError(null);
    setIsStartingCheckout(true);

    try {
      const response = await fetch("/api/wilma/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-legalease-device-id": anonymousId
        },
        body: JSON.stringify({
          sessionId,
          deviceId: anonymousId
        })
      });
      const data = (await response.json().catch(() => ({}))) as WilmaCheckoutApiResponse;

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(checkoutErrorMessage(data.reason));
      }

      window.location.assign(data.checkoutUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Checkout is not available yet.");
      setIsStartingCheckout(false);
    }
  }

  return (
    <section className="wilma-widget" aria-labelledby="wilma-title">
      <div className="wilma-widget__header">
        <div>
	          <p className="wilma-eyebrow">RecordShield readiness</p>
          <h1 id="wilma-title">Ask Wilma</h1>
        </div>
        {decision ? <EligibilityBadge status={decision.status} /> : null}
      </div>

      <div className="wilma-controls">
        <label>
          <span>State</span>
          <select value={state} onChange={(event) => setState(event.target.value)} disabled={launchConfig?.available === false}>
            {visibleStates.map(([value, label]) => (
              <option key={value || "empty"} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {launchConfig?.available === false ? (
        <p className="wilma-error">{launchConfig.message ?? "Wilma is not available right now. Please check back soon."}</p>
      ) : null}

      <div className="wilma-messages" aria-live="polite">
        {messages.map((message) => (
          <div className={`wilma-message wilma-message--${message.role}`} key={message.id}>
            {message.content}
          </div>
        ))}
      </div>

      {decision ? (
        <div className="wilma-result">
          <strong>{resultLabel(decision.status)}</strong>
          {decision.reasons[0] ? <span>{decision.reasons[0].message}</span> : null}
        </div>
      ) : null}

      {pendingResult ? (
        <form className="wilma-email-gate" onSubmit={revealPendingResult}>
          <strong>I have enough information to prepare your eligibility summary. Where should I send a copy?</strong>
          <label>
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="wilma-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>By continuing, you agree that LegalEase may email you your eligibility summary and information about the document-preparation service.</span>
          </label>
          <button type="submit" disabled={!email.trim() || !consent || isCapturingLead}>
            {isCapturingLead ? "Saving" : "Continue"}
          </button>
        </form>
      ) : null}

      <form className="wilma-compose" onSubmit={submitMessage}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tell Wilma about the case"
          disabled={launchConfig?.available === false}
        />
        <button type="submit" disabled={!canSend}>
          {isSending ? "Sending" : "Send"}
        </button>
      </form>

      {error ? <p className="wilma-error">{error}</p> : null}

      {showPaidCta ? (
        <button className="wilma-cta" type="button" onClick={startCheckout} disabled={isStartingCheckout}>
          {isStartingCheckout ? "Opening checkout" : "Continue to $50 document prep"}
        </button>
      ) : null}
    </section>
  );
}

function createAnonymousId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function readBetaToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("wilma_beta") ?? "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toDecision(status: WilmaChatStatus | undefined, reasonCodes: string[]): WilmaDecision | null {
  if (!status) {
    return null;
  }

  return {
    status,
    reasons: reasonCodes.map((code) => ({ code, message: reasonMessage(code) }))
  };
}

function EligibilityBadge({ status }: { status: WilmaDecision["status"] }) {
  return <span className={`wilma-badge wilma-badge--${status}`}>{resultLabel(status)}</span>;
}

function resultLabel(status: WilmaDecision["status"]): string {
  const labels: Record<WilmaDecision["status"], string> = {
    collecting_information: "Collecting details",
	    likely_eligible_for_document_prep: "May be ready",
    not_a_fit_for_this_service: "Not a fit",
    needs_more_information: "Needs details",
    outside_supported_scope: "Outside scope"
  };

  return labels[status];
}

function reasonMessage(code: string): string {
  const messages: Record<string, string> = {
    missing_state: "Wilma needs the record state.",
    unsupported_state: "Wilma does not support that state yet.",
	    missing_eligibility_information: "Wilma needs a few more readiness details.",
    sentence_incomplete: "Sentence completion must be confirmed.",
    open_case: "Open cases are outside this automated flow.",
    outstanding_balance: "Outstanding balances are outside this automated flow.",
	    legal_advice_request: "Wilma can organize facts but cannot provide attorney guidance.",
    legal_strategy_request: "Wilma can screen facts but cannot provide legal strategy.",
    guarantee_request: "Wilma cannot guarantee legal outcomes.",
    court_prediction_request: "Wilma cannot predict court outcomes."
  };

  return messages[code] ?? code.replaceAll("_", " ");
}

function checkoutErrorMessage(reason: string | undefined): string {
  const messages: Record<string, string> = {
    email_not_captured: "Enter your email before continuing to document prep.",
    not_likely_eligible: "Checkout is available only after Wilma confirms this fits the document-prep workflow.",
    missing_session: "Wilma could not find this screening session.",
    missing_decision: "Finish the eligibility chat before continuing."
  };

  return messages[reason ?? ""] ?? "Checkout is not available yet.";
}
