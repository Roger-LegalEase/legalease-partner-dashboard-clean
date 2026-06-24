import type { Metadata } from "next";
import { getExpungementAiBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(getExpungementAiBaseUrl()),
  title: "Expungement.ai",
  description: "Self-help record-clearing packets and guidance",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg"
  },
  openGraph: {
    title: "Expungement.ai",
    description: "Self-help record-clearing packets and guidance",
    images: ["/expungement-ai/hero-1500.jpg"]
  }
};

export default function ExpungementAiLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
