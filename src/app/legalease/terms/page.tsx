import type { Metadata } from "next";
import { HandoffHtml } from "../HandoffHtml";

export const metadata: Metadata = {
  title: "LegalEase Terms and Conditions",
  description: "LegalEase Terms and Conditions."
};

export default function LegalEaseTermsPage() {
  return <HandoffHtml file="terms.html" />;
}
