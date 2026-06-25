"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type Message = {
  role: "wilma" | "user";
  text: string;
};

const initialMessages: Message[] = [
  {
    role: "wilma",
    text: "Hey, I'm Wilma. I'm here to make this whole thing make sense, no legal jargon, no judgment."
  }
];

export function WilmaScriptedPreview() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text }, { role: "wilma", text: scriptedResponse(text) }]);
  }

  return (
    <>
      {open ? (
        <section className="le-wilma-panel" aria-label="Scripted Wilma preview">
          <header>
            <Image src="/legalease/wilma/wilma-avatar-128.png" alt="" width={44} height={44} />
            <div>
              <strong>Wilma</strong>
              <div>Scripted preview</div>
            </div>
          </header>
          <div className="le-wilma-messages">
            {messages.map((message, index) => (
              <div className={`le-wilma-message ${message.role === "user" ? "user" : ""}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
          </div>
          <form onSubmit={submit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a general question" aria-label="Ask Wilma" />
            <button type="submit">Send</button>
          </form>
          <div className="le-wilma-foot">Wilma is a scripted guide, not a lawyer. This preview never calls a model or gives eligibility verdicts.</div>
        </section>
      ) : null}
      <div className="le-wilma-fab">
        <button className="le-wilma-button" type="button" aria-label="Ask Wilma" onClick={() => setOpen((value) => !value)}>
          <Image src="/legalease/wilma/wilma-avatar-128.png" alt="" width={44} height={44} />
        </button>
      </div>
    </>
  );
}

function scriptedResponse(text: string) {
  const normalized = text.toLowerCase();
  if (/(immigration|federal|active case|deadline|emergency|strategy|warrant|custody|eviction|court date|hearing)/.test(normalized)) {
    return "This needs human help. I can't safely answer hard-stop topics here, but you can contact LegalEase at /legalease/contact so the right person can route it.";
  }

  if (/(eligible|eligibility|qualify|can i clear|can i expunge|record)/.test(normalized)) {
    return "I can't give an eligibility verdict here. Start with Expungement.ai's guided check at /expungement-ai/check, or go to /expungement-ai.";
  }

  if (/(support|help|contact|refund|receipt|login|account)/.test(normalized)) {
    return "For support, use /legalease/contact and choose the topic that fits. That routes to the LegalEase OS support workflow.";
  }

  if (/(cost|price|lawyer|attorney)/.test(normalized)) {
    return "Expungement.ai is $50 for the self-help packet path. Lawyers often cost far more, which is why LegalEase builds tools for matters people can handle themselves.";
  }

  return "LegalEase builds self-help legal tools. Expungement.ai is the first live proof point, RCAP supports partners, and the next products are opening through the waitlist.";
}
