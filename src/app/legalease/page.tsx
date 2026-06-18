import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LegalEaseFooter } from "./LegalEaseFooter";
import { LegalEaseNav } from "./LegalEaseNav";
import { WilmaScriptedPreview } from "./WilmaScriptedPreview";
import { legaleaseProducts } from "@/lib/legalease/products";

export const metadata: Metadata = {
  title: "LegalEase | Infrastructure for Self-Help Law",
  description: "Most everyday legal matters do not need a lawyer. LegalEase builds self-help law infrastructure, with Expungement.ai as the first live proof point."
};

const investors = [
  ["Techstars", "techstars.png"],
  ["Slauson & Co.", "slauson.png"],
  ["SV2", "sv2.png"],
  ["Gold House", "gold-house.png"],
  ["Samvid Ventures", "samvid.png"],
  ["Copacetic", "copacetic.png"],
  ["Innovate Mississippi", "innovate-mississippi.png"]
];

export default function LegalEasePage() {
  const proof = legaleaseProducts.find((product) => product.id === "expungement-ai")!;
  const available = legaleaseProducts.filter((product) => product.status === "available-now");
  const roadmap = legaleaseProducts.filter((product) => product.status === "roadmap");

  return (
    <>
      <LegalEaseNav />
      <main>
        <section className="le-cinematic">
          <div className="le-container le-cinematic-grid">
            <div>
              <p className="le-eyebrow">Open door, not legal maze</p>
              <h1>
                The law has too many locked doors. LegalEase opens the ones you can walk through <em>yourself.</em>
              </h1>
              <p className="le-cinematic-copy">
                Most everyday legal matters do not need a lawyer. They need someone who knows the steps. LegalEase builds the tools that take you from &quot;I do not understand this&quot; to &quot;it is done,&quot; one matter at a time.
              </p>
              <p>
                <Link className="le-button" href="/expungement-ai">
                  Start with Expungement.ai
                </Link>
              </p>
            </div>
            <div className="le-dark-wall" aria-label="Three product rooms behind the legal jargon wall">
              <div className="le-door-label">Legal jargon wall opening into three rooms</div>
              <div className="le-wilma-stage">
                <Image src="/legalease/wilma/wilma-doors.png" alt="Wilma opening the LegalEase door" width={600} height={720} priority />
              </div>
              <div className="le-room-stack">
                <Room logo="expungement-ai.png" label="Expungement.ai" copy="Record clearing for $50." />
                <Room logo="rcap.png" label="RCAP" copy="Partner record-clearing rails." />
                <Room logo="record-shield-mark.png" label="Record Shield" copy="Background-check visibility." />
              </div>
            </div>
          </div>
        </section>

        <section className="le-section soft" aria-label="Lawyer cost proof">
          <div className="le-container">
            <div className="le-proof-strip">
              <div className="le-proof-card legal">
                <div className="price">$2,500</div>
                <p>What many people expect to pay a lawyer for a record-clearing matter.</p>
              </div>
              <div className="le-proof-versus">VERSUS</div>
              <div className="le-proof-card">
                <div className="price">$50</div>
                <p>Expungement.ai turns the same kind of self-help packet workflow into a guided product.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="le-section" aria-label="Backed by investors">
          <div className="le-container">
            <p className="le-eyebrow">Backed by</p>
            <div className="le-investors">
              {investors.map(([name, file]) => (
                <Image key={name} src={`/legalease/investors/${file}`} alt={name} width={180} height={70} />
              ))}
            </div>
          </div>
        </section>

        <section className="le-section soft" id="products">
          <div className="le-container">
            <div className="le-section-title">
              <p className="le-eyebrow">Product catalog</p>
              <h2>
                Expungement.ai is the proof point. LegalEase is the <em>company behind the system.</em>
              </h2>
              <p className="le-section-lede">LegalEase owns and houses a growing family of products for self-help law, partner workflows, and fresh-start infrastructure.</p>
            </div>
            <div className="le-grid">
              <article className="le-product-card proof" data-product-role="dominant-proof-point">
                <Image src="/legalease/logos/expungement-ai.png" alt="Expungement.ai" width={420} height={160} />
                <div>
                  <span className="le-tag orange">Dominant proof point</span>
                  <h3>{proof.name}</h3>
                  <p>{proof.description}</p>
                  <Link className="le-button" href={proof.ctaHref}>
                    {proof.ctaLabel}
                  </Link>
                </div>
              </article>
              {available.map((product) => (
                <article className="le-product-card" data-product-role="available-now" key={product.id}>
                  <span className="le-tag">Available now</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <Link className="le-button secondary" href={product.ctaHref}>
                    {product.ctaLabel}
                  </Link>
                </article>
              ))}
              {roadmap.map((product) => (
                <article className="le-product-card" data-product-role="roadmap-waitlist" key={product.id}>
                  <span className="le-tag orange">Roadmap waitlist</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <Link className="le-button secondary" href={product.ctaHref}>
                    {product.ctaLabel}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="le-section">
          <div className="le-container">
            <div className="le-section-title">
              <p className="le-eyebrow">How it works</p>
              <h2>
                Three steps from confusion to <em>next action.</em>
              </h2>
            </div>
            <div className="le-steps">
              <Step num="01" title="Answer plain questions" copy="No legal vocabulary required. The product asks for the facts it needs in words people actually use." />
              <Step num="02" title="Get organized outputs" copy="LegalEase turns answers into checklists, packets, filing steps, or partner work items depending on the product." />
              <Step num="03" title="Know when to get help" copy="The system routes hard-stop issues to human help instead of pretending every problem is safe for self-help." />
            </div>
          </div>
        </section>

        <section className="le-section soft">
          <div className="le-container">
            <div className="le-section-title">
              <p className="le-eyebrow">Safety</p>
              <h2>
                Built for self-help, with <em>guardrails.</em>
              </h2>
            </div>
            <div className="le-safety-grid">
              <Safety title="Information, not legal advice" copy="LegalEase gives legal information and self-help tools. It does not form an attorney-client relationship." />
              <Safety title="Hard-stop routing" copy="Immigration, federal matters, active cases, deadlines, emergencies, and legal strategy are routed to human help." />
              <Safety title="LegalEase OS workflow" copy="Support, contact, waitlist, and correspondence workflows route toward LegalEase OS as the operational source of truth." />
            </div>
          </div>
        </section>

        <section className="le-section">
          <div className="le-container le-trust-grid">
            <article className="le-testimonial">
              <p className="le-eyebrow">Customer proof</p>
              <blockquote>&quot;I never thought I could do this myself. LegalEase made it clear, step by step, and I finally got my record handled.&quot;</blockquote>
              <p>Ricky W.</p>
            </article>
            <article className="le-founder">
              <div className="le-founder-mark">
                <Image src="/legalease/brand/le-mark.svg" alt="" width={92} height={92} />
              </div>
              <div>
                <div className="name">Lawrence Blackmon</div>
                <div className="title">State Representative</div>
                <p>&quot;Most people do not need a lawyer. They need to understand their options and afford the next step. That is what we build.&quot;</p>
              </div>
            </article>
          </div>
        </section>

        <section className="le-section dark" id="partners">
          <div className="le-container">
            <p className="le-eyebrow">Partners</p>
            <h2>
              Help more people, <em>without hiring more people.</em>
            </h2>
            <p className="le-section-lede">
              LegalEase gives clinics, legal aid offices, public defenders, and reentry programs the same technology we put in everyone&apos;s hands, so your team can serve more people without adding headcount.
            </p>
            <div className="le-partner-pills">
              <span>Legal aid</span>
              <span>Public defenders</span>
              <span>Reentry programs</span>
              <span>Expungement clinics</span>
              <span>Community orgs</span>
            </div>
            <Link className="le-button" href="/request-pilot">
              Request a pilot
            </Link>
          </div>
        </section>
      </main>
      <LegalEaseFooter />
      <WilmaScriptedPreview />
    </>
  );
}

function Room({ logo, label, copy }: { logo: string; label: string; copy: string }) {
  return (
    <div className="le-room">
      <div>
        <strong>{label}</strong>
        <span>{copy}</span>
      </div>
      <Image src={`/legalease/logos/${logo}`} alt={label} width={220} height={80} />
    </div>
  );
}

function Step({ num, title, copy }: { num: string; title: string; copy: string }) {
  return (
    <article className="le-step">
      <div className="num">{num}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function Safety({ title, copy }: { title: string; copy: string }) {
  return (
    <article className="le-safety-card">
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
