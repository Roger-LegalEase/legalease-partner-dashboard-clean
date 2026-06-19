"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { legaleaseProducts, type LegalEaseProductId } from "@/lib/legalease/products";

const waitlistProducts = legaleaseProducts.filter((product) => ["record-shield", "startapart", "claimcoach"].includes(product.id));
const productParamAliases: Record<string, LegalEaseProductId> = {
  recordshield: "record-shield",
  startapart: "startapart",
  claimcoach: "claimcoach"
};
const productTags: Partial<Record<LegalEaseProductId, { label: string; className: string }>> = {
  "record-shield": { label: "In beta", className: "beta" },
  startapart: { label: "In build", className: "build" },
  claimcoach: { label: "In build", className: "build" }
};

export function WaitlistForm() {
  const searchParams = useSearchParams();
  const preselectedParam = searchParams.get("product") ?? "";
  const preselected = (productParamAliases[preselectedParam.toLowerCase()] ?? preselectedParam) as LegalEaseProductId | "";
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
      <div className="success show">
        <div className="ring">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1F8F88" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>You&apos;re on the list.</h2>
        <p>We&apos;ll email you the moment {selectedProduct.name} opens. Keep an eye on your inbox.</p>
        <a className="home" href="/legalease">
          &larr; Back to LegalEase
        </a>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="eyebrow">The next door</div>
      <h1>
        Be first <em>through it.</em>
      </h1>
      <p className="lede">This one isn&apos;t open yet. Tell us where to reach you and we&apos;ll let you know the moment it does, no spam, no waiting room.</p>
      <div className="prod-label">Which are you waiting on?</div>
      <div className="prods">
        {waitlistProducts.map((item) => {
          const tag = productTags[item.id];
          return (
          <button className={`prod ${product === item.id ? "sel" : ""}`} type="button" key={item.id} onClick={() => setProduct(item.id)}>
            <span className="dot" />
            <span className="pinfo">
              <span className="pname">{item.name}</span>
              <span className="pdesc">{item.shortDescription}</span>
            </span>
            {tag ? <span className={`ptag ${tag.className}`}>{tag.label}</span> : null}
          </button>
          );
        })}
      </div>
      <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" required placeholder="First and last" />
      </div>
      <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <button className="submit" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Joining..." : "Join the waitlist"}
      </button>
      <p className="fineprint">We&apos;ll only email you about the product you picked. Nothing else.</p>
      {error ? <div className="msg show">{error}</div> : null}
    </form>
  );
}
