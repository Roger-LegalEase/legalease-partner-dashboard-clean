import type { LaunchKitPayload } from "@/lib/partners/onboarding/artifact-generator";

/**
 * The launch kit as a partner would use it: the code to print, the address it
 * encodes, the copy blocks to paste, and the guardrails those blocks were
 * written to. The address is server-derived and, in this release, not yet
 * reachable — which the view says rather than implies.
 */
export function LaunchKitView({ launchKit }: { launchKit: LaunchKitPayload }) {
  return (
    <div className="space-y-5" data-launch-kit="true">
      <section
        className="rounded-lg border border-grayWilma-200 bg-white p-5"
        aria-labelledby="launch-kit-code-heading"
      >
        <h4
          id="launch-kit-code-heading"
          className="text-sm font-black uppercase tracking-wide text-navy"
        >
          Participant code and address
        </h4>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="QR code for this partner's participant page"
            className="h-40 w-40 rounded-md border border-grayWilma-200 bg-white p-2"
            data-launch-kit-qr="true"
            src={launchKit.qr.qrDataUrl}
          />
          <div className="min-w-0">
            <p
              className="break-all font-mono text-sm text-navy"
              data-launch-kit-target={launchKit.qr.targetUrl}
            >
              {launchKit.qr.targetUrl}
            </p>
            <p className="mt-2 text-xs font-semibold text-orange">
              {launchKit.qr.published
                ? "This address is live."
                : "Not published yet. Do not print or share this code until LegalEase publishes the page."}
            </p>
          </div>
        </div>
      </section>

      {launchKit.copy.map((block) => (
        <section
          key={block.key}
          className="rounded-lg border border-grayWilma-200 bg-white p-5"
          data-launch-kit-copy={block.key}
        >
          <h4 className="text-sm font-black uppercase tracking-wide text-navy">
            {block.label}
          </h4>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-grayWilma-800">
            {block.body}
          </p>
        </section>
      ))}

      <section
        className="rounded-lg border border-grayWilma-200 bg-white p-5"
        aria-labelledby="launch-kit-faq-heading"
      >
        <h4
          id="launch-kit-faq-heading"
          className="text-sm font-black uppercase tracking-wide text-navy"
        >
          Participant questions
        </h4>
        <dl className="mt-3 space-y-3">
          {launchKit.faq.map((entry) => (
            <div key={entry.question}>
              <dt className="text-sm font-black text-navy">{entry.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-grayWilma-700">
                {entry.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="rounded-lg border border-orange/30 bg-orange/10 p-5"
        aria-labelledby="launch-kit-guardrails-heading"
      >
        <h4
          id="launch-kit-guardrails-heading"
          className="text-sm font-black uppercase tracking-wide text-orange"
        >
          Claims and terminology guardrails · LegalEase-controlled
        </h4>
        <ul className="mt-3 space-y-1.5">
          {launchKit.guardrails.map((rule) => (
            <li
              key={rule}
              className="flex gap-2 text-sm leading-relaxed text-grayWilma-800"
            >
              <span aria-hidden="true" className="text-orange">
                •
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
