import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HandoffStyles } from "../HandoffHtml";
import { WaitlistForm } from "../WaitlistForm";

export const metadata: Metadata = {
  title: "Join the LegalEase Waitlist",
  description: "Be first through the door for upcoming LegalEase self-help law products."
};

export default function LegalEaseWaitlistPage() {
  return (
    <>
      <HandoffStyles file="waitlist.html" />
      <nav className="nav">
        <Link href="/legalease">
          <Image className="logo" src="/legalease/logos/legalease-wordmark.png" alt="LegalEase" width={180} height={45} priority />
        </Link>
        <Link className="back" href="/legalease">
          &larr; Back
        </Link>
      </nav>
      <main className="wrap">
        <div className="card">
          <Suspense>
            <WaitlistForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
