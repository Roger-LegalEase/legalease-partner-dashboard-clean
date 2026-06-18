import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Newspaper, Users } from "lucide-react";
import { Suspense } from "react";
import { ContactForm } from "../ContactForm";

export const metadata: Metadata = {
  title: "Contact LegalEase",
  description: "Get in touch with LegalEase for support, partnerships, press, or other correspondence."
};

export default function LegalEaseContactPage() {
  return (
    <main className="le-form-page">
      <div className="le-contact-shell">
        <section className="le-contact-rail">
          <p className="le-eyebrow">Contact</p>
          <h1>
            Tell us what you <em>need.</em>
          </h1>
          <p>Pick the path that fits, or send a note and we will get it to the right person.</p>
          <Path icon={<MessageCircle size={22} />} title="Help with your record" copy="Already started on Expungement.ai? Wilma can answer most questions right inside the app." />
          <Path icon={<Users size={22} />} title="Partnerships" copy={<span>Run a clinic or program? <Link href="/request-pilot">Request a pilot</Link>.</span>} />
          <Path icon={<Newspaper size={22} />} title="Press and everything else" copy={<span>Email us directly at <a href="mailto:info@legalease.law">info@legalease.law</a>.</span>} />
        </section>
        <section className="le-contact-form">
          <Suspense>
            <ContactForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

function Path({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: React.ReactNode }) {
  return (
    <div className="le-path">
      <div className="le-path-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}
