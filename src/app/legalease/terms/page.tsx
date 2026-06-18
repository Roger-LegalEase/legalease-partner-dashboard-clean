import type { Metadata } from "next";
import { LegalDocument } from "../LegalDocument";
import { termsSections } from "@/lib/legalease/legal-content";

export const metadata: Metadata = {
  title: "LegalEase Terms and Conditions",
  description: "LegalEase Terms and Conditions."
};

export default function LegalEaseTermsPage() {
  return <LegalDocument title="LegalEase Terms and Conditions" updated="June 18, 2026" sections={termsSections} />;
}
