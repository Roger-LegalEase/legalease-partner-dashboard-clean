import { NextResponse } from "next/server";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import {
  claimFirstAdminSetupToken,
  FirstAdminProvisioningError
} from "@/lib/partners/first-admin-service";
import {
  firstAdminClaimCookie,
  FIRST_ADMIN_CLAIM_COOKIE,
  FIRST_ADMIN_CLAIM_PATH
} from "@/lib/partners/first-admin-claim-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const claim = await claimFirstAdminSetupToken(token);
    if (claim.mode === "existing_account") {
      // The invited email already has exactly one confirmed account. No Auth
      // call was made and none is made here: the invitation is carried through
      // the ordinary sign-in flow in an HttpOnly cookie and consumed only after
      // a session proves the same address.
      const response = NextResponse.redirect(
        absolutePartnerAppUrl(
          `/sign-in?next=${encodeURIComponent(FIRST_ADMIN_CLAIM_PATH)}`
        ),
        303
      );
      response.cookies.set(firstAdminClaimCookie(token));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
    const response = NextResponse.redirect(claim.actionLink, 303);
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
    response.cookies.delete(FIRST_ADMIN_CLAIM_COOKIE);
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
