import "server-only";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { partnerBillingMaxAmountCents, partnerBillingMinAmountCents } from "@/lib/partners/billing";

export const dynamic = "force-dynamic";

export default async function NewInternalBillingPage() {
  const access = await resolveInternalAdminPageAccess("/internal/billing/new");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link href="/internal/billing" className="text-sm font-semibold text-teal hover:text-navy">
          Back to billing
        </Link>
        <div className="mt-6">
          <Badge tone="teal">Internal admin</Badge>
          <h1 className="mt-3 text-4xl font-black text-navy">Create partner invoice</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
            Use only after discovery and scoping. Partners cannot set invoice amount, plan, price ID, or billing scope.
          </p>
        </div>

        <Card className="mt-8 rounded-md p-6">
          <form action="/internal/billing/create" method="post" className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="partnerSlug" className="text-sm font-semibold text-navy">
                Partner slug
              </label>
              <input id="partnerSlug" name="partnerSlug" className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" placeholder="optional-existing-partner" />
            </div>

            <div className="grid gap-2">
              <label htmlFor="partnerPilotRequestId" className="text-sm font-semibold text-navy">
                Partner pilot request ID
              </label>
              <input id="partnerPilotRequestId" name="partnerPilotRequestId" className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" placeholder="Optional UUID" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="contactEmail" className="text-sm font-semibold text-navy">
                  Billing contact email
                </label>
                <input id="contactEmail" name="contactEmail" type="email" required className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="contactName" className="text-sm font-semibold text-navy">
                  Billing contact name
                </label>
                <input id="contactName" name="contactName" className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="amountDollars" className="text-sm font-semibold text-navy">
                  Scoped amount in USD
                </label>
                <input id="amountDollars" name="amountDollars" inputMode="decimal" required className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" placeholder="1000.00" />
                <p className="text-xs font-semibold text-grayWilma-600">
                  Allowed range: {formatUsd(partnerBillingMinAmountCents)} to {formatUsd(partnerBillingMaxAmountCents)}.
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="dueDate" className="text-sm font-semibold text-navy">
                  Due date
                </label>
                <input id="dueDate" name="dueDate" type="date" className="min-h-11 rounded-md border border-grayWilma-300 px-3 text-sm" />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-semibold text-navy">
                Invoice memo
              </label>
              <textarea id="description" name="description" required maxLength={500} rows={4} className="rounded-md border border-grayWilma-300 px-3 py-2 text-sm" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="min-h-11 px-5">
                Create Stripe invoice
              </Button>
              <Link href="/internal/billing" className="inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100">
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

function formatUsd(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amountCents / 100);
}
