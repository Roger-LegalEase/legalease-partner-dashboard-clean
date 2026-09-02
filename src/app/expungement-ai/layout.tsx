import type { Metadata } from "next";
import { getExpungementAiBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(getExpungementAiBaseUrl()),
  title: "Expungement.ai | Free guided record-clearing check",
  description:
    "Start a free screening. If a supported self-help packet is available, review your information before paying $50 to generate it.",
  icons: {
    icon: [
      { url: "/expungement-ai/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/expungement-ai/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/expungement-ai/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: { url: "/expungement-ai/apple-touch-icon.png", sizes: "180x180" }
  },
  openGraph: {
    title: "Expungement.ai | Free guided record-clearing check",
    description:
      "Start a free screening. If a supported self-help packet is available, review your information before paying $50 to generate it.",
    type: "website",
    siteName: "Expungement.ai",
    images: ["/expungement-ai/hero/expungement-ai-hero-poster.jpg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Expungement.ai | Free guided record-clearing check",
    description:
      "Start a free screening. If a supported self-help packet is available, review your information before paying $50 to generate it.",
    images: ["/expungement-ai/hero/expungement-ai-hero-poster.jpg"]
  }
};

export default function ExpungementAiLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
