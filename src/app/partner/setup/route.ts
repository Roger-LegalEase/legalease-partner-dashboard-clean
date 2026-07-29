import { NextResponse } from "next/server";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import {
  claimFirstAdminSetupToken,
  FirstAdminProvisioningError
} from "@/lib/partners/first-admin-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const { actionLink } = await claimFirstAdminSetupToken(token);
    const response = NextResponse.redirect(actionLink, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    if (!(error instanceof FirstAdminProvisioningError)) {
      // Public output intentionally does not distinguish account, partner, or
      // provider state.
    }
    const response = NextResponse.redirect(
      absolutePartnerAppUrl(
        "/auth/set-password?next=/partner/dashboard&first_admin_error=inactive"
      ),
      303
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}

export function POST() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}
