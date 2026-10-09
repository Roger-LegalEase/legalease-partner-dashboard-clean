import { PracticeNotice } from "@/components/partners/onboarding/PracticeNotice";
import { isDisposableLaunchEnvironment } from "@/lib/partners/onboarding/synthetic-launch-security";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { LocalizationProvider } from "@/components/expungement-ai/LocalizationProvider";
import { WebAnalyticsTracker } from "@/components/analytics/WebAnalyticsTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultMetadata: Metadata = {
  title: "LegalEase Partner Dashboard",
  description: "Partner dashboard for LegalEase partners",
  // Default LegalEase mark for the partner dashboard / legalease surfaces. This replaces the
  // former `src/app/favicon.ico` file convention (moved to `public/favicon.ico`) so the icon is
  // no longer auto-injected on *every* route — notably the consumer expungement.ai pages, whose
  // nested layout (`src/app/expungement-ai/layout.tsx`) overrides `icons` with its own brand set.
  icons: {
    icon: "/favicon.ico",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host !== "legaleasepartner.com" && host !== "www.legaleasepartner.com") return defaultMetadata;
  return { ...defaultMetadata, icons: {
    icon: [
      { url: "/expungement-ai/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/expungement-ai/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/expungement-ai/icon-512.png", type: "image/png", sizes: "512x512" }
    ], apple: { url: "/expungement-ai/apple-touch-icon.png", sizes: "180x180" }
  }};
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocalizationProvider>{isDisposableLaunchEnvironment() ? <PracticeNotice /> : null}{children}</LocalizationProvider>
        <WebAnalyticsTracker />
      </body>
    </html>
  );
}
