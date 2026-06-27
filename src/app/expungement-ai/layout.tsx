import type { Metadata } from "next";
import { getExpungementAiBaseUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(getExpungementAiBaseUrl()),
  title: "Expungement.ai",
  description: "Self-help record-clearing packets and guidance",
  icons: {
    icon: [
      { url: "/expungement-ai/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/expungement-ai/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/expungement-ai/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: { url: "/expungement-ai/apple-touch-icon.png", sizes: "180x180" }
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
