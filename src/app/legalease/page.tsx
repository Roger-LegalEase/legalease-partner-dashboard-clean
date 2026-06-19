import type { Metadata } from "next";
import { HandoffHtml } from "./HandoffHtml";

export const metadata: Metadata = {
  title: "LegalEase - The infrastructure for self-help law",
  description: "Most everyday legal matters do not need a lawyer. LegalEase builds the tools to handle them yourself."
};

export default function LegalEasePage() {
  return <HandoffHtml file="legalease-opendoor.html" />;
}
