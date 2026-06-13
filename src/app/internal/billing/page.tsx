import "server-only";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { listPartnerBillingRequestsForInternalAdmin, type PartnerBillingRequest } from "@/lib/partners/billing";

export const dynamic = "force-dynamic";

export default async function InternalBillingPage() {
  const access = await resolveInternalAdminPageAccess("/internal/billing");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  let billingRequests: PartnerBillingRequest[] = [];
  let loadError = "";
  try {
    billingRequests = await listPartnerBillingRequestsForInternalAdmin();
  } catch {
    loadError = "Billing requests are unavailable. Confirm the reviewed billing migration has been applied.";
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge tone="teal">Internal admin</Badge>
            <h1 className="mt-3 text-4xl font-black text-navy">Partner billing</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Custom-scoped Stripe invoices for LegalEase partner engagements.
            </p>
          </div>
          <Link href="/internal/billing/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-wilmaBlue">
            New invoice
          </Link>
        </div>

        {loadError ? (
          <Card className="mt-8 rounded-md border-orange/40 bg-white p-5">
            <p className="text-sm font-semibold text-orange">{loadError}</p>
          </Card>
        ) : null}

        <div className="mt-8 grid gap-4">
          {billingRequests.map((request) => (
            <Card key={request.id} className="rounded-md p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal" aria-hidden="true" />
                    <h2 className="text-lg font-black text-navy">{request.description}</h2>
                  </div>
                  <p className="mt-2 text-sm text-grayWilma-700">
                    {request.partnerSlug ? `Partner: ${request.partnerSlug}` : "Partner not linked"} · {formatUsd(request.amountCents)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-grayWilma-600">Created {formatDate(request.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={request.status === "paid" ? "teal" : request.status === "payment_failed" ? "orange" : "neutral"}>
                    {request.status.replaceAll("_", " ")}
                  </Badge>
                  {request.stripeInvoiceUrl ? (
                    <a href={request.stripeInvoiceUrl} rel="noreferrer" target="_blank" className="inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100">
                      Hosted invoice
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!loadError && billingRequests.length === 0 ? (
          <Card className="mt-8 rounded-md p-6 text-center">
            <p className="text-sm font-semibold text-grayWilma-700">No partner billing requests yet.</p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function formatUsd(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}
