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
      <div className="le-success">
        <h2>Message sent.</h2>
        <p>Thanks for reaching out. We will reply to your email soon.</p>
        <a className="le-button secondary" href="/legalease">
          Back to LegalEase
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="le-form-label">What brings you here?</div>
      <div className="le-choice-grid">
        {topics.map((item) => (
          <button className={`le-choice ${topic === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setTopic(item.id)}>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      <div className="le-field-grid">
        <div className="le-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" required placeholder="First and last" />
        </div>
        <div className="le-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
      </div>
      <div className="le-field">
        <label htmlFor="organization">Organization optional</label>
        <input id="organization" name="organization" placeholder="Company, clinic, or outlet" />
      </div>
      <div className="le-field">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required placeholder="How can we help?" />
      </div>
      <button className="le-button le-submit" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Sending..." : "Send message"}
      </button>
      <p className="le-form-note">We read every message and reply to the email you give us. Operational routing goes through LegalEase OS.</p>
      {error ? <div className="le-form-error">{error}</div> : null}
    </form>
  );
}
