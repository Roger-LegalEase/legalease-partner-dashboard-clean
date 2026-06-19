"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

const topics = [
  { id: "support", label: "Help with my record" },
  { id: "partnership", label: "Partnership" },
  { id: "press", label: "Press" },
  { id: "other", label: "Something else" }
];

export function ContactForm() {
  const searchParams = useSearchParams();
  const initial = topics.some((topic) => topic.id === searchParams.get("topic")) ? searchParams.get("topic") ?? "support" : "support";
  const [topic, setTopic] = useState(initial);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const topicLabel = topics.find((item) => item.id === topic)?.label ?? "Something else";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/legalease/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        organization: String(form.get("organization") ?? ""),
        topic,
        topic_label: topicLabel,
        message: String(form.get("message") ?? ""),
        source: "contact"
      })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to send message right now.");
      setStatus("idle");
      return;
    }
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="success show">
        <div className="ring">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1F8F88" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>Message sent.</h2>
        <p>Thanks for reaching out. We&apos;ll reply to your email soon.</p>
        <a className="home" href="/legalease">
          &larr; Back to LegalEase
        </a>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="flabel">What brings you here?</div>
      <div className="topics">
        {topics.map((item) => (
          <button className={`topic ${topic === item.id ? "sel" : ""}`} type="button" key={item.id} onClick={() => setTopic(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required placeholder="First and last" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="organization">
          Organization <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--silver-soft)" }}>(optional)</span>
        </label>
        <input id="organization" name="organization" placeholder="Company, clinic, or outlet" />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required placeholder="How can we help?" />
      </div>
      <button className="submit" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Sending..." : "Send message"}
      </button>
      <p className="fineprint">We read every message and reply to the email you give us.</p>
      {error ? <div className="msg show">{error}</div> : null}
    </form>
  );
}
