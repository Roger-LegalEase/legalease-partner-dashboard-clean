import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
