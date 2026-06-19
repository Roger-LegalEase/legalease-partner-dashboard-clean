import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm } from "../ContactForm";
import { HandoffStyles } from "../HandoffHtml";

export const metadata: Metadata = {
  title: "Contact LegalEase",
  description: "Get in touch with LegalEase for support, partnerships, press, or other correspondence."
};

export default function LegalEaseContactPage() {
  return (
    <>
      <HandoffStyles file="contact.html" />
      <nav className="nav">
        <Link href="/legalease">
          <Image className="logo" src="/legalease/logos/legalease-wordmark.png" alt="LegalEase" width={180} height={45} priority />
        </Link>
        <Link className="back" href="/legalease">
          &larr; Back
        </Link>
      </nav>
      <main className="wrap">
        <div className="shell">
          <section className="rail-col">
            <div className="eyebrow">Contact</div>
            <h1>
              Tell us what you <em>need.</em>
            </h1>
            <p className="sub">Pick the path that fits, or send a note and we&apos;ll get it to the right person.</p>
            <div className="paths">
              <Path
                icon={
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                }
                title="Help with your record"
                copy="Already started on Expungement.ai? Wilma can answer most questions right inside the app."
              />
              <Path
                icon={
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
                title="Partnerships"
                copy={
                  <span>
                    Run a clinic or program? <Link href="/request-pilot">Request a pilot</Link>.
                  </span>
                }
              />
              <Path
                icon={
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
                title="Press & everything else"
                copy={
                  <span>
                    Email us directly at <a href="mailto:info@legalease.law">info@legalease.law</a>.
                  </span>
                }
              />
            </div>
          </section>
          <section className="form-col">
          <Suspense>
            <ContactForm />
          </Suspense>
          </section>
        </div>
      </main>
    </>
  );
}

function Path({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: React.ReactNode }) {
  return (
    <div className="path">
      <div className="pi">{icon}</div>
      <div>
        <div className="pt">{title}</div>
        <div className="pd">{copy}</div>
      </div>
    </div>
  );
}
