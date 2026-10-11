import Link from "next/link";

const destinations = [
  ["RCAP Programs", "/internal/partners/onboarding", "Create or open a program, review current materials, and manage launch and clinic operations."],
  ["Partner performance", "/internal/command-center/performance#partners", "Current partner operating records. Outcome reporting remains unavailable until verified."],
  ["DTC performance", "/internal/command-center/performance#dtc", "Consumer conversion sources and their connection status."],
  ["Platform health", "/internal/command-center/performance#health", "Read-only source status. An unavailable source does not indicate a healthy service."],
  ["Financial / sponsorship operations", "/internal/billing", "Verified financial records and existing authorized billing workflows."],
  ["Access and team", "/internal/partner-users", "Existing authorized memberships and access administration."],
  ["Legal, compliance, support", "/internal/command-center/readiness", "Release and legal readiness checklist; this is not live monitoring."],
  ["Marketing / analytics", "/internal/command-center/web-traffic", "Existing first-party website traffic and campaign context."]
] as const;

export default function InternalHome() {
  return <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
    <p className="font-semibold text-[#08786F]">LegalEase operations</p>
    <h1 className="mt-2 text-4xl font-black">Command Center</h1>
    <p className="mt-4 max-w-2xl text-grayWilma-700">One place to prepare partner programs and find the tools your role permits.</p>
    <nav aria-label="Command Center destinations" className="mt-8 grid gap-4 md:grid-cols-2">
      {destinations.map(([title, href, description],index) => <Link key={href} href={href}
        className={`rounded-xl border p-6 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal ${index===0 ? "border-navy bg-navy text-white" : "border-grayWilma-200 bg-white text-navy hover:border-teal"}`}>
        <h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6">{description}</p>
        <span className="mt-4 inline-flex min-h-11 items-center text-sm font-bold">Open workspace →</span>
      </Link>)}
    </nav>
  </main>;
}
