import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Public partner checkout is not supported. LegalEase partner billing uses scoped Stripe invoices."
    },
    { status: 410 }
  );
}
