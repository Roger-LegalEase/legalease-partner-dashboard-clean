import Link from "next/link";
import {
  partnerRecoveryPresentation,
  type PartnerRecoveryCode
} from "@/lib/partners/onboarding/brand-page-presentation";

export function PartnerRecoveryState({
  code,
  genericHeading
}: {
  code: PartnerRecoveryCode;
  genericHeading?: string;
}) {
  const recovery = partnerRecoveryPresentation(code);
  return (
    <section
      aria-labelledby={`partner-recovery-${code}`}
      className="border-l-[6px] border-[#FF3B00] bg-[#F7F4EE] p-5 text-left"
      data-partner-recovery={code}
    >
      <h2
        className="text-xl font-extrabold text-[#071B33]"
        id={`partner-recovery-${code}`}
      >
        {genericHeading ?? recovery.heading}
      </h2>
      <dl className="mt-4 grid gap-3 text-sm leading-6">
        <div>
          <dt className="font-extrabold text-[#071B33]">What happened</dt>
          <dd className="text-[#475A6E]">{recovery.happened}</dd>
        </div>
        <div>
          <dt className="font-extrabold text-[#071B33]">What remained safe</dt>
          <dd className="text-[#475A6E]">{recovery.safe}</dd>
        </div>
        <div>
          <dt className="font-extrabold text-[#071B33]">What you can do now</dt>
          <dd className="text-[#475A6E]">{recovery.next}</dd>
        </div>
      </dl>
      <Link
        className="mt-5 inline-flex min-h-12 items-center justify-center bg-[#071B33] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#0A6E77] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
        href={recovery.returnHref}
      >
        {recovery.returnLabel}
      </Link>
      <p className="mt-4 break-words text-xs leading-5 text-[#475A6E]">
        If the issue continues, email{" "}
        <a
          className="font-bold text-[#0A6E77] underline underline-offset-4"
          href="mailto:partners@legalease.com"
        >
          partners@legalease.com
        </a>
        .
      </p>
    </section>
  );
}
