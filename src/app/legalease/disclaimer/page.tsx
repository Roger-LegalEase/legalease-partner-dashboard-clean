import type { Metadata } from "next";
import { LegalDocument } from "../LegalDocument";
import { disclaimerSections } from "@/lib/legalease/legal-content";

export const metadata: Metadata = {
  title: "LegalEase Website Disclaimer",
  description: "LegalEase Website Disclaimer."
};

export default function LegalEaseDisclaimerPage() {
  return <LegalDocument title="LegalEase Website Disclaimer" updated="June 18, 2026" sections={disclaimerSections} />;
}
