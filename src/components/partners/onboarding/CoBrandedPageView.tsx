import type {
  CoBrandedPagePreview,
  PagePreviewField
} from "@/lib/partners/onboarding/artifact-generator";

/**
 * The participant-page composition shared by desktop and 390px private
 * previews. Ownership annotations are absent by default. An authorized
 * internal caller may opt into the review overlay, which is presentation-only
 * and never changes the page configuration.
 */
export function CoBrandedPageView({
  preview,
  variant,
  logoSrc,
  ownershipReview = false
}: {
  preview: CoBrandedPagePreview;
  variant: "desktop" | "mobile";
  logoSrc: string | null;
  ownershipReview?: boolean;
}) {
  const mobile = variant === "mobile";
  const privacyHref = safePublicHref(preview.partnerPrivacyUrl?.value ?? null);
  const accessibilityHref = safePublicHref(
    preview.accessibilityUrl?.value ?? null
  );

  return (
    <div
      className={
        mobile
          ? "w-[390px] max-w-full overflow-hidden border-2 border-[#071B33] bg-[#F7F4EE]"
          : "w-full overflow-hidden border-2 border-[#071B33] bg-[#F7F4EE]"
      }
      data-preview-variant={variant}
      {...(ownershipReview
        ? { "data-content-ownership-review": "enabled" }
        : {})}
    >
      {ownershipReview ? <OwnershipLegend /> : null}

      <div className={mobile ? "h-[844px] overflow-y-auto" : "min-h-[620px]"}>
        <OwnershipGroup
          enabled={ownershipReview}
          label="System derived"
          tone="slate"
        >
          <header
            className={`border-b border-[#B8C1C7] bg-white ${
              mobile ? "px-5 py-5" : "px-8 py-6"
            }`}
          >
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#0A6E77] [font-family:var(--font-rcap-mono)]">
              {preview.publicName.value
                ? `${preview.publicName.value} × RCAP by LegalEase`
                : "RCAP by LegalEase"}
            </p>
            <div className="mt-4 flex min-w-0 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                {preview.showPartnerLogo && logoSrc ? (
                  // The source is always a tenant-scoped authenticated route.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`${preview.publicName.value ?? "Partner"} logo`}
                    className="h-12 w-auto max-w-[150px] object-contain"
                    src={logoSrc}
                  />
                ) : null}
                <div className="min-w-0">
                  {preview.programName.value ? (
                    <p className="truncate text-base font-extrabold text-[#071B33]">
                      {preview.programName.value}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs font-semibold text-[#475A6E]">
                    Powered by Expungement.ai
                  </p>
                </div>
              </div>
            </div>
          </header>
        </OwnershipGroup>

        <OwnershipGroup
          enabled={ownershipReview}
          label="Partner supplied"
          tone="teal"
        >
          <main>
            <section
              className={`border-b border-[#B8C1C7] ${
                mobile ? "px-5 py-8" : "px-8 py-12"
              }`}
            >
              <FieldContent field={preview.headline}>
                <h2
                  className={`max-w-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-[#071B33] ${
                    mobile ? "text-3xl" : "text-5xl"
                  }`}
                >
                  {preview.headline.value}
                </h2>
              </FieldContent>
              <FieldContent field={preview.subheadline}>
                <p
                  className={`mt-5 max-w-2xl leading-7 text-[#475A6E] ${
                    mobile ? "text-base" : "text-lg"
                  }`}
                >
                  {preview.subheadline.value}
                </p>
              </FieldContent>
              <FieldContent field={preview.primaryActionLabel}>
                <span className="mt-7 inline-flex min-h-12 items-center justify-center bg-[#FF3B00] px-6 py-3 text-sm font-extrabold text-white">
                  {preview.primaryActionLabel.value}
                </span>
              </FieldContent>
            </section>

            <section
              className={`grid border-b border-[#B8C1C7] ${
                mobile ? "gap-8 px-5 py-8" : "gap-10 px-8 py-10 md:grid-cols-2"
              }`}
            >
              <div className="space-y-7">
                <ContentBlock
                  field={preview.organizationDescription}
                  label="About the organization"
                />
                <ContentBlock
                  field={preview.serviceArea}
                  label="Service area"
                />
                {preview.targetAudience ? (
                  <ContentBlock
                    field={preview.targetAudience}
                    label="Who this program serves"
                  />
                ) : null}
              </div>
              <div className="space-y-7">
                <ContentBlock
                  field={preview.participantSupportCopy}
                  label="Getting help"
                />
                <ContentBlock
                  field={preview.languageAvailability}
                  label="Languages"
                />
                <SupportRoute preview={preview} />
              </div>
            </section>
          </main>
        </OwnershipGroup>

        <OwnershipGroup
          enabled={ownershipReview}
          label="LegalEase controlled"
          tone="navy"
        >
          <footer className={mobile ? "bg-white px-5 py-7" : "bg-white px-8 py-8"}>
            {preview.legalEaseSupportRouting.value ? (
              <p className="max-w-3xl text-sm leading-6 text-[#071B33]">
                {preview.legalEaseSupportRouting.value}
              </p>
            ) : null}
            <div className={`mt-6 grid gap-5 ${mobile ? "" : "md:grid-cols-2"}`}>
              {preview.legalBlocks.map((block) => (
                <div key={block.category}>
                  <h3 className="text-xs font-extrabold text-[#071B33]">
                    {block.heading}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[#475A6E]">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
            {privacyHref || accessibilityHref ? (
              <nav
                aria-label="Participant information"
                className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-[#D8DDDF] pt-5"
              >
                {privacyHref ? (
                  <a
                    className="min-h-11 py-3 text-xs font-bold text-[#0A6E77] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A]"
                    href={privacyHref}
                    rel="noopener noreferrer"
                  >
                    Privacy
                  </a>
                ) : null}
                {accessibilityHref ? (
                  <a
                    className="min-h-11 py-3 text-xs font-bold text-[#0A6E77] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A]"
                    href={accessibilityHref}
                    rel="noopener noreferrer"
                  >
                    Accessibility
                  </a>
                ) : null}
              </nav>
            ) : null}
            {preview.showPoweredBy ? (
              <p className="mt-6 text-xs font-bold text-[#475A6E]">
                Powered by Expungement.ai
              </p>
            ) : null}
          </footer>
        </OwnershipGroup>
      </div>
    </div>
  );
}

function ContentBlock({
  label,
  field
}: {
  label: string;
  field: PagePreviewField;
}) {
  return (
    <FieldContent field={field}>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A6E77] [font-family:var(--font-rcap-mono)]">
          {label}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#071B33]">{field.value}</p>
      </div>
    </FieldContent>
  );
}

function SupportRoute({ preview }: { preview: CoBrandedPagePreview }) {
  if (!preview.supportEmail.value && !preview.supportPhone.value) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A6E77] [font-family:var(--font-rcap-mono)]">
        Participant support
      </h3>
      {preview.supportEmail.value ? (
        <p className="mt-2 break-words text-sm leading-6 text-[#071B33]">
          Email {preview.supportEmail.value}
        </p>
      ) : null}
      {preview.supportPhone.value ? (
        <p className="mt-1 text-sm leading-6 text-[#071B33]">
          Call {preview.supportPhone.value}
        </p>
      ) : null}
    </div>
  );
}

function FieldContent({
  field,
  children
}: {
  field: PagePreviewField;
  children: React.ReactNode;
}) {
  if (field.value === null) return null;
  return <>{children}</>;
}

function OwnershipLegend() {
  return (
    <aside
      aria-label="Content ownership review"
      className="border-b-2 border-[#071B33] bg-[#EEF7F6] px-5 py-4"
    >
      <p className="text-xs font-extrabold text-[#071B33]">
        Content ownership review
      </p>
      <p className="mt-1 text-xs leading-5 text-[#475A6E]">
        Partner supplied | LegalEase controlled | System derived
      </p>
    </aside>
  );
}

function OwnershipGroup({
  children,
  enabled,
  label,
  tone
}: {
  children: React.ReactNode;
  enabled: boolean;
  label: string;
  tone: "teal" | "navy" | "slate";
}) {
  if (!enabled) return <>{children}</>;
  const border =
    tone === "teal"
      ? "border-[#0A8E9A]"
      : tone === "navy"
        ? "border-[#071B33]"
        : "border-[#475A6E]";
  return (
    <section
      aria-label={label}
      className={`relative border-l-4 ${border}`}
      data-content-source={label.toLowerCase().replaceAll(" ", "_")}
    >
      <p className="bg-[#F7F4EE] px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </p>
      {children}
    </section>
  );
}

function safePublicHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
