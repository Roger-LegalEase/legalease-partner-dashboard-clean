/**
 * All-51 state picker (50 states + DC). Each choice links into the profile-driven flow at
 * /expungement-ai/screening/{code}. The route param is the uppercase jurisdiction code (e.g. IL,
 * DC); code/slug conversion for the live backend stays isolated in `profile-loader.ts`.
 *
 * Server component: the jurisdiction list is read from the profile source at render time, so the
 * mock data stays on the server and out of the client bundle.
 */
import Link from "next/link";
import { listAvailableJurisdictions } from "@/lib/expungement-ai/frontend/profile-loader";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

export function StatePicker() {
  const jurisdictions = listAvailableJurisdictions();

  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 pt-28 font-sans md:px-8">
      <div className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]"><LocalizedText k="screening.free_screening" fallback="Free screening" /></p>
        <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-[#0B1320] md:text-[38px]">
          <LocalizedText k="screening.where_record" fallback="Where is the record?" />
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          <LocalizedText k="screening.state_picker_body" fallback="Choose the state or district where the case happened. We will ask a few plain questions for that place. This is legal information, not legal advice, and there is no payment to check." />
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-state-count={jurisdictions.length}>
        {jurisdictions.map((jurisdiction) => (
          <li key={jurisdiction.code}>
            <Link
              href={`/expungement-ai/screening/${jurisdiction.code}`}
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#E4E8EF] bg-white px-4 py-3 text-[15px] font-semibold text-[#0B1320] shadow-sm transition-colors hover:border-[#00A99D] hover:bg-[#E7F7F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
            >
              <span>{jurisdiction.name}</span>
              <span className="text-xs font-bold text-[#8A93A6]">{jurisdiction.code}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
