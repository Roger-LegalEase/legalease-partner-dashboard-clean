"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { legaleaseProducts, type LegalEaseProductId } from "@/lib/legalease/products";

const waitlistProducts = legaleaseProducts.filter((product) => ["record-shield", "startapart", "claimcoach", "fresh-start-network", "rcap", "expungement-ai"].includes(product.id));

export function WaitlistForm() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("product") as LegalEaseProductId | null;
  const initial: LegalEaseProductId = waitlistProducts.some((product) => product.id === preselected) && preselected ? preselected : "record-shield";
  const [product, setProduct] = useState<LegalEaseProductId>(initial);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const selectedProduct = useMemo(() => waitlistProducts.find((item) => item.id === product) ?? waitlistProducts[0], [product]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/legalease/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        product,
        product_name: selectedProduct.name,
        source: "waitlist"
      })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to join the waitlist right now.");
      setStatus("idle");
      return;
    }
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="le-form-card le-success">
        <h2>You&apos;re on the list.</h2>
        <p>We&apos;ll email you the moment {selectedProduct.name} opens. Keep an eye on your inbox.</p>
        <a className="le-button secondary" href="/legalease">
          Back to LegalEase
        </a>
      </div>
    );
  }

  return (
    <form className="le-form-card" onSubmit={submit}>
      <div className="le-eyebrow">The next door</div>
      <h1>
        Be first <em>through it.</em>
      </h1>
      <p className="lede">This one is not open yet. Tell us where to reach you and we will let you know the moment it does, no spam, no waiting room.</p>
      <div className="le-form-label">Which are you waiting on?</div>
      <div className="le-choice-grid">
        {waitlistProducts.map((item) => (
          <button className={`le-choice ${product === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setProduct(item.id)}>
            <strong>{item.name}</strong>
            <span>{item.shortDescription}</span>
          </button>
        ))}
      </div>
      <div className="le-field-grid">
        <div className="le-field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" required placeholder="First and last" />
        </div>
        <div className="le-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
      </div>
      <button className="le-button le-submit" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Joining..." : "Join the waitlist"}
      </button>
      <p className="le-form-note">We will only email you about the product you picked. Nothing else.</p>
      {error ? <div className="le-form-error">{error}</div> : null}
    </form>
  );
}
