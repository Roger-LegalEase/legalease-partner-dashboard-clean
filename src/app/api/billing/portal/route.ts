import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/billing/checkout";

export async function POST() {
  const user = await requireUser();
  const session = await createBillingPortalSession(user);

  if (!session) {
    return NextResponse.json({ error: "No Stripe customer is available for this user." }, { status: 404 });
  }

  return NextResponse.json({ url: session.url }, { status: 201 });
}
