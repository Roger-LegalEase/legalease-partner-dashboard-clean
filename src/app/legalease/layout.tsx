import type { Metadata } from "next";
import "./LegalEaseStyles.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "LegalEase",
    template: "%s | LegalEase"
  },
  description: "LegalEase is infrastructure for self-help law. Expungement.ai is the first live proof point.",
  openGraph: {
    title: "LegalEase",
    description: "Infrastructure for self-help law.",
    images: ["/legalease/brand/og-card.png"]
  }
};

export default function LegalEaseLayout({ children }: { children: React.ReactNode }) {
  return <div className="legalease-site">{children}</div>;
}
