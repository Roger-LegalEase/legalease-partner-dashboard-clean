import type { PartnerFacingChangeRequest } from "@/lib/partners/onboarding/guided-substeps";

export function GuidedChangeRequestPanel({
  requests,
  currentValue,
  fieldLabel,
  sectionLevel
}: {
  requests: readonly PartnerFacingChangeRequest[];
  currentValue?: unknown;
  fieldLabel?: string | null;
  sectionLevel: boolean;
}) {
  const active = requests.find(
    (request) =>
      request.status === "open" || request.status === "partner_responded"
  );
  const history = requests.filter(
    (request) =>
      request.status === "resolved" || request.status === "cancelled"
  );

  if (!active && history.length === 0) return null;

  return (
    <div className="grid gap-5">
      {active ? (
        <section
          aria-labelledby={`change-request-${active.id}`}
          className={`border-l-[6px] bg-white p-5 md:p-6 ${
            active.status === "open"
              ? "border-[#FF3B00]"
              : "border-[#0A8E9A]"
          }`}
          data-active-change-request={active.status}
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
            LegalEase review request
          </p>
          <h2
            className="mt-2 text-xl font-extrabold text-[#071B33]"
            id={`change-request-${active.id}`}
          >
            {active.status === "open"
              ? "A correction is required"
              : "Your correction is with LegalEase"}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#071B33]">
            This request applies to this part of the section.
          </p>
          {sectionLevel ? (
            <p className="mt-2 text-sm leading-6 text-[#475A6E]">
              The current request is attached to the section rather than one
              authoritative field. No field-level target has been inferred
              from the request text.
            </p>
          ) : null}

          <dl className="mt-5 grid border border-[#B8C1C7] sm:grid-cols-2">
            <RequestFact label="Requested by" value={active.requestedByLabel} />
            <RequestFact
              label="Requested on"
              value={formatTimestamp(active.requestedAt)}
            />
            <RequestFact
              label="Reason"
              value={active.requestedCorrection}
              wide
            />
            <RequestFact
              label="Current value"
              value={
                sectionLevel
                  ? "Review the section tasks. The request is not tied to one field."
                  : `${fieldLabel || "Requested field"}: ${formatValue(
                      currentValue
                    )}`
              }
              wide
            />
            <RequestFact
              label="Requested correction"
              value={active.requestedCorrection}
              wide
            />
            <RequestFact
              label="Partner response"
              value={active.partnerResponse || "No response recorded"}
              wide
            />
            <RequestFact
              label="Resolution status"
              value={changeRequestStatusLabel(active.status)}
              wide
            />
          </dl>

          {active.status === "open" ? (
            <p className="mt-4 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
              Correct the relevant task, then submit the section. The current
              authoritative workflow records the partner response when that
              submission succeeds.
            </p>
          ) : (
            <p className="mt-4 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
              No further partner action is required unless LegalEase requests
              another correction.
            </p>
          )}
        </section>
      ) : null}

      {history.length > 0 ? (
        <details className="border border-[#B8C1C7] bg-white p-5">
          <summary className="min-h-11 cursor-pointer text-sm font-extrabold text-[#071B33] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2">
            View resolved request history ({history.length})
          </summary>
          <ol className="mt-4 grid gap-4">
            {history.map((request) => (
              <li className="border-l-4 border-[#475A6E] pl-4" key={request.id}>
                <p className="text-sm font-bold text-[#071B33]">
                  {changeRequestStatusLabel(request.status)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#475A6E]">
                  {request.requestedCorrection}
                </p>
                <p className="mt-2 text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                  Requested {formatTimestamp(request.requestedAt)}
                  {request.resolvedAt
                    ? ` | Resolved ${formatTimestamp(request.resolvedAt)}`
                    : ""}
                </p>
                {request.partnerResponse ? (
                  <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                    Partner response: {request.partnerResponse}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function RequestFact({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 border-b border-[#D8DDDF] p-4 sm:border-r ${
        wide ? "sm:col-span-2 sm:border-r-0" : "sm:even:border-r-0"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </dt>
      <dd className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-[#071B33]">
        {value}
      </dd>
    </div>
  );
}

function changeRequestStatusLabel(
  status: PartnerFacingChangeRequest["status"]
): string {
  const labels: Record<PartnerFacingChangeRequest["status"], string> = {
    open: "Partner correction required",
    partner_responded: "Waiting on LegalEase",
    resolved: "Resolved",
    cancelled: "Closed without a correction"
  };
  return labels[status];
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded time unavailable";
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(date)} UTC`;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0
      ? value
          .map((item) =>
            item && typeof item === "object"
              ? "Saved list item"
              : String(item)
          )
          .join(", ")
      : "Not provided";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim() || "Not provided";
  if (typeof value === "number") return String(value);
  return "Not provided";
}
