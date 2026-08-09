import type { PartnerSupportContact } from "@/lib/partners/onboarding/support-contact";

// One rendering of the support destination, so every blocker, failure and empty state
// offers the same working route instead of each surface inventing its own wording.
//
// This is a real mailto with an accessible name, never a dead text label. The caller passes
// the resolved contact rather than reading configuration itself, which keeps environment
// access on the server and out of the component tree.

export function PartnerSupportLink({
  contact,
  href,
  children,
  className
}: {
  contact: PartnerSupportContact;
  /** Optional context-carrying mailto from partnerSupportMailto(). Defaults to the plain address. */
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={
        className ??
        "font-semibold text-[#0F6E56] underline underline-offset-4 hover:text-[#0F1E3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
      }
      href={href ?? contact.mailtoHref}
      aria-label={contact.accessibleName}
    >
      {children ?? contact.label}
    </a>
  );
}

/**
 * The standard "we cannot help you from this screen, here is who can" block. Used for
 * blockers and failure states where the partner has no self-service next step.
 */
export function PartnerSupportHelp({
  contact,
  href,
  lead = "If this does not look right, email LegalEase partner support and we will pick it up from here.",
  className
}: {
  contact: PartnerSupportContact;
  href?: string;
  lead?: string;
  className?: string;
}) {
  return (
    <p className={className ?? "mt-3 text-sm leading-6 text-[#5C5750]"}>
      {lead}{" "}
      <PartnerSupportLink contact={contact} href={href} />
      {". "}
      <span className="text-[#8A8278]">Opens your email app.</span>
    </p>
  );
}
