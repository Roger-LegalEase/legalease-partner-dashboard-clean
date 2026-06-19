import type { Metadata } from "next";
import { HandoffHtml } from "../HandoffHtml";

export const metadata: Metadata = {
  title: "LegalEase Website Disclaimer",
  description: "LegalEase Website Disclaimer."
};

export default function LegalEaseDisclaimerPage() {
  return <HandoffHtml file="disclaimer.html" />;
}
