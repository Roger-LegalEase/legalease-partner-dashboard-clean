import Link from "next/link";
import { LegalEaseFooter } from "./LegalEaseFooter";
import { LegalEaseNav } from "./LegalEaseNav";
import { legaleaseAddress, type LegalSection } from "@/lib/legalease/legal-content";

export function LegalDocument({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <LegalEaseNav />
      <main className="le-legal-page">
        <header className="le-legal-head">
          <div className="le-container">
            <p className="le-eyebrow">LegalEase</p>
            <h1>{title}</h1>
            <p>Last Updated: {updated}</p>
          </div>
        </header>
        <div className="le-container le-legal-layout">
          <aside className="le-toc" aria-label={`${title} table of contents`}>
            {sections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id}>
                {index + 1}. {section.title}
              </a>
            ))}
          </aside>
          <article className="le-legal-doc">
            <p>
              This document applies to websites, applications, product pages, partner pages, intake tools, AI-assisted tools, client portals, partner dashboards, forms, communications, and related services operated by LegalEase Incorporated that link to it.
            </p>
            <p>
              Contact: {legaleaseAddress.slice(0, 3).join(", ")}. Email: <a href="mailto:info@legalease.law">info@legalease.law</a>.
            </p>
            {sections.map((section, index) => (
              <section id={section.id} key={section.id}>
                <h2>
                  <span>{index + 1}. </span>
                  {section.title}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.subsections?.map((subsection) => (
                  <div key={subsection.title}>
                    <h3>{subsection.title}</h3>
                    {subsection.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ))}
                {section.id === "privacy" ? (
                  <p>
                    <Link href="/privacy">Read the current Privacy Policy.</Link>
                  </p>
                ) : null}
              </section>
            ))}
          </article>
        </div>
      </main>
      <LegalEaseFooter />
    </>
  );
}
