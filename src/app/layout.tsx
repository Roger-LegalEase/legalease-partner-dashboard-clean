import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegalEase RecordShield",
  description: "RecordShield foundation for customer and admin workflows."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              LegalEase RecordShield
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
