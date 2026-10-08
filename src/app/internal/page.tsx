import Link from "next/link";

export default function InternalHome() {
  return <main className="mx-auto max-w-6xl px-4 py-12">
    <p className="font-semibold text-teal">LegalEase</p>
    <h1 className="mt-2 text-3xl font-black">Command Center</h1>
    <p className="mt-4 text-grayWilma-700">Prepare partner programs and review their actual next steps.</p>
    <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-navy px-5 py-3 font-bold text-white" href="/internal/partners/onboarding">RCAP Partner Launch Studio</Link>
    <p className="mt-6 text-sm text-grayWilma-700">Legacy report exports are unavailable while measured source definitions are verified.</p>
  </main>;
}
