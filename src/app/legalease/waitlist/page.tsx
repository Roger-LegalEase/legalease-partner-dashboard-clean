import type { Metadata } from "next";
import { Suspense } from "react";
import { WaitlistForm } from "../WaitlistForm";

export const metadata: Metadata = {
  title: "Join the LegalEase Waitlist",
  description: "Be first through the door for upcoming LegalEase self-help law products."
};

export default function LegalEaseWaitlistPage() {
  return (
    <main className="le-form-page">
      <Suspense>
        <WaitlistForm />
      </Suspense>
    </main>
  );
}
