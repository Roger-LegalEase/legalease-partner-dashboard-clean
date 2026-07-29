import type {
  CoBrandedPagePreview,
  PagePreviewField
} from "@/lib/partners/onboarding/artifact-generator";

/**
 * Renders the draft co-branded page the way a participant would see it, rather
 * than as a form. Every slot is marked with the side that owns it, LegalEase-
 * controlled content is called out as not partner-editable, and a missing field
 * or asset is named along with where it is set instead of rendering a broken
 * page.
 *
 * There is deliberately no publish or activate control here, and no address a
 * participant could reach.
 */
export function CoBrandedPageView({
  preview,
  variant,
  logoSrc
}: {
  preview: CoBrandedPagePreview;
  variant: "desktop" | "mobile";
  logoSrc: string | null;
}) {
  const mobile = variant === "mobile";
  return (
    <div
      className={
        mobile
          ? "w-[390px] max-w-full overflow-hidden rounded-[1.75rem] border-4 border-navy/80 bg-white"
          : "w-full overflow-hidden rounded-lg border border-grayWilma-300 bg-white"
      }
      data-preview-variant={variant}
    >
      <div
        className={
          mobile
            ? "h-[844px] overflow-y-auto"
            : "min-h-[520px]"
        }
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-grayWilma-200 px-5 py-4">
          <div className="flex items-center gap-3">
            {preview.showPartnerLogo ? (
              logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-10 w-auto max-w-[160px] object-contain"
                  src={logoSrc}
                />
              ) : (
                <MissingAsset
                  label={preview.logo.label}
                  whereToSet={preview.logo.whereToSet}
                />
              )
            ) : null}
            <Slot field={preview.publicName}>
              <span className="text-base font-black text-navy">
                {preview.publicName.value}
              </span>
            </Slot>
          </div>
          {preview.programName.value ? (
            <Slot field={preview.programName}>
              <span className="text-xs font-semibold text-grayWilma-700">
                {preview.programName.value}
              </span>
            </Slot>
          ) : null}
        </header>

        <section className="border-b border-grayWilma-200 bg-[#faf9f7] px-5 py-8">
          <Slot field={preview.headline}>
            <h2
              className={`font-black leading-tight text-navy ${
                mobile ? "text-2xl" : "text-4xl"
              }`}
            >
              {preview.headline.value}
            </h2>
          </Slot>
          <div className="mt-3">
            <Slot field={preview.subheadline}>
              <p className="text-base leading-relaxed text-grayWilma-800">
                {preview.subheadline.value}
              </p>
            </Slot>
          </div>
          <div className="mt-5">
            <Slot field={preview.primaryActionLabel}>
              <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-bold text-white">
                {preview.primaryActionLabel.value}
              </span>
            </Slot>
          </div>
        </section>

        <section className={`grid gap-6 px-5 py-7 ${mobile ? "" : "md:grid-cols-2"}`}>
          <div className="space-y-4">
            <Block label="About this organization" field={preview.organizationDescription} />
            <Block label="Who this program serves" field={preview.serviceArea} />
            <Block label="Languages" field={preview.languageAvailability} />
          </div>
          <div className="space-y-4">
            <Block label="Getting help" field={preview.participantSupportCopy} />
            <Block label="Support email" field={preview.supportEmail} />
            {preview.supportPhone.value ? (
              <Block label="Support phone" field={preview.supportPhone} />
            ) : null}
          </div>
        </section>

        {preview.heroImage.assetId === null ? (
          <div className="px-5 pb-6">
            <MissingAsset
              label={preview.heroImage.label}
              whereToSet={preview.heroImage.whereToSet}
              optional
            />
          </div>
        ) : null}

        <section className="border-t border-grayWilma-200 bg-white px-5 py-6">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-orange">
            LegalEase-controlled · not partner-editable
          </p>
          {preview.legalEaseSupportRouting.value ? (
            <p className="mt-3 text-sm leading-relaxed text-navy">
              {preview.legalEaseSupportRouting.value}
            </p>
          ) : null}
          <dl className="mt-4 space-y-3">
            {preview.legalBlocks.map((block) => (
              <div key={block.category} data-legalease-category={block.category}>
                <dt className="text-xs font-black text-navy">{block.heading}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-grayWilma-700">
                  {block.body}
                </dd>
              </div>
            ))}
          </dl>
          {preview.showPoweredBy ? (
            <p className="mt-5 text-xs font-semibold text-grayWilma-700">
              Powered by LegalEase
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Block({ label, field }: { label: string; field: PagePreviewField }) {
  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-grayWilma-700">
        {label}
      </p>
      <div className="mt-1">
        <Slot field={field}>
          <p className="text-sm leading-relaxed text-navy">{field.value}</p>
        </Slot>
      </div>
    </div>
  );
}

/**
 * One page slot. When the value is present it renders as page content with an
 * ownership marker; when it is absent it names the field and where it is set.
 */
function Slot({
  field,
  children
}: {
  field: PagePreviewField;
  children: React.ReactNode;
}) {
  if (field.value === null) {
    return (
      <p
        className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-xs text-orange"
        data-missing-field={field.key}
      >
        <span className="font-bold">Not yet provided: {field.label}.</span> Set
        this in {field.whereToSet}.
      </p>
    );
  }
  return (
    <span
      className="inline-block"
      data-page-slot={field.key}
      data-ownership={field.ownership}
    >
      {children}
      <span
        className={`ml-2 align-middle rounded px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide ${
          field.ownership === "legalease_controlled"
            ? "bg-orange/15 text-orange"
            : "bg-teal/15 text-teal"
        }`}
      >
        {field.ownership === "legalease_controlled"
          ? "LegalEase"
          : "Partner"}
      </span>
    </span>
  );
}

function MissingAsset({
  label,
  whereToSet,
  optional
}: {
  label: string;
  whereToSet: string;
  optional?: boolean;
}) {
  return (
    <p
      className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-xs text-orange"
      data-missing-asset={label}
    >
      <span className="font-bold">
        {optional ? "Not uploaded" : "Missing"}: {label}.
      </span>{" "}
      Upload it in {whereToSet}.
    </p>
  );
}
