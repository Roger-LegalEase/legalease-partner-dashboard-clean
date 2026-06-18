import type { Metadata } from "next";

export const metadata: Metadata = {
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
