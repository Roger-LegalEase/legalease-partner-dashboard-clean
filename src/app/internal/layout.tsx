import type { Metadata } from "next";
import type { ReactNode } from "react";
import { unstable_noStore as noStore } from "next/cache";
import {
  InternalAdminDenied,
  resolveInternalAdminPageAccess
} from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function InternalLayout({ children }: { children: ReactNode }) {
  noStore();
  const access = await resolveInternalAdminPageAccess("/internal");
  if (access.kind === "denied") {
    return (
      <InternalAdminDenied
        title={access.title}
        body={access.body}
        email={access.email}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-navy">
      <header className="sticky top-0 z-50 border-b border-grayWilma-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[110rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            <p className="text-sm font-black text-navy">LegalEase Internal</p>
            <p className="text-xs font-semibold text-grayWilma-600">Protected administrative workspace</p>
          </div>
          <section
            aria-label="Signed-in internal account"
            className="flex flex-col gap-2 rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-4"
          >
            <p className="min-w-0 break-all">
              <span className="font-semibold text-grayWilma-600">Signed in as:</span>{" "}
              <span className="font-black text-navy">{access.session.email}</span>
            </p>
            <p>
              <span className="font-semibold text-grayWilma-600">Role:</span>{" "}
              <span className="font-black text-navy">{access.session.role}</span>
            </p>
            <form action="/sign-out" method="post">
              <button
                type="submit"
                aria-label="Sign out of LegalEase Internal"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:w-auto"
              >
                Sign out
              </button>
            </form>
          </section>
        </div>
      </header>
      {children}
    </div>
  );
}
