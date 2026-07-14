import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { EmptyState, Panel, Pill, StatCard, formatDateTime, humanize } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { isContentStorageConfigured, listCmsTestimonials } from "@/lib/content/cms-queries";

export const dynamic = "force-dynamic";

const CONSENT_LABELS: Record<string, string> = {
  written_consent: "Written consent",
  partner_approved: "Partner approved",
  user_consented: "User consented",
  unknown: "No consent recorded"
};

export default async function TestimonialsPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/testimonials");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const testimonials = await listCmsTestimonials();
  const configured = isContentStorageConfigured();

  const approved = testimonials.filter((item) => item.approved).length;
  const unconsented = testimonials.filter((item) => item.consentStatus === "unknown").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Testimonials</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Real, consented testimonials only. A testimonial cannot be approved for display without a
          recorded consent basis — the database refuses the write, not just this page. There is no way
          to add an invented testimonial here, and that is deliberate.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={testimonials.length} />
        <StatCard label="Approved for display" value={approved} />
        <StatCard label="No consent recorded" value={unconsented} />
      </section>

      {unconsented > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <strong>
            {unconsented} testimonial{unconsented === 1 ? "" : "s"} have no recorded consent basis.
          </strong>{" "}
          They cannot be approved for display until the consent is recorded, with a reference to where
          it is held.
        </div>
      )}

      <Panel
        title="All testimonials"
        description="Editing and consent capture are handled in the intake flow that collects the consent, not here — a CMS field is not a consent record."
      >
        {testimonials.length === 0 ? (
          <EmptyState
            message="No testimonials."
            hint={
              configured
                ? "Testimonials arrive from the consented intake flow."
                : "Content storage is not configured in this environment."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {testimonials.map((item) => (
              <li key={item.testimonialId} className="py-4">
                <blockquote className="border-l-4 border-orange pl-3 text-sm italic leading-6 text-navy">
                  “{item.quote}”
                </blockquote>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-navy">{item.attribution}</span>
                  {item.roleTitle && <span className="text-xs text-slate-600">{item.roleTitle}</span>}
                  {item.partnerSlug && (
                    <span className="font-mono text-[11px] text-slate-400">{item.partnerSlug}</span>
                  )}
                  <Pill tone={item.consentStatus === "unknown" ? "block" : "ok"}>
                    {CONSENT_LABELS[item.consentStatus] ?? humanize(item.consentStatus)}
                  </Pill>
                  <Pill tone={item.approved ? "ok" : "neutral"}>
                    {item.approved ? "Approved" : "Not approved"}
                  </Pill>
                  <span className="ml-auto text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                </div>
                {item.consentReference && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Consent reference: {item.consentReference}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
