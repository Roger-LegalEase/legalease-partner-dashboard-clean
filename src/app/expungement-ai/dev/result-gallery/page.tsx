import { notFound } from "next/navigation";

import { ResultGallery } from "@/components/expungement-ai/screening/ResultGallery";

/**
 * DEVELOPMENT-ONLY route for visual QA of the nine result screens. It is blocked in production:
 * `notFound()` makes it return 404 in a production build, so it is inaccessible to consumers.
 * There is no link to it from the consumer flow.
 */
export const metadata = {
  robots: { index: false, follow: false }
};

export default function ResultGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0B1320]">
      <ResultGallery />
    </main>
  );
}
