import { NextResponse } from "next/server";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import {
  acceptFirstAdminInvitation,
  FirstAdminProvisioningError
} from "@/lib/partners/first-admin-service";
import {
  getSafeRequestId,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";
import { isFirstAdminSameOriginRequest } from "@/lib/partners/first-admin-request-security";

export const dynamic = "force-dynamic";

const routeName = "/api/partners/first-admin/accept";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  if (!isFirstAdminSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 }
    );
  }
  try {
    const auth = await createServerSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: "Authentication required." },
        { status: 401 }
      );
    }
    const result = await acceptFirstAdminInvitation(data.user);
    logSecurityInfo({
      event: "first_admin acceptance succeeded",
      route: routeName,
      outcome: result.replayPrevented ? "replay_prevented" : "accepted",
      requestId,
      metadata: {
        action: "first_admin_acceptance",
        status: result.replayPrevented ? "replay_prevented" : "accepted"
      }
    });
    return NextResponse.json({
      ok: true,
      redirectTo: result.redirectTo,
      replayPrevented: result.replayPrevented
    });
  } catch (error) {
    const known =
      error instanceof FirstAdminProvisioningError ? error : null;
    logSecurityWarn({
      event: "first_admin acceptance failed",
      route: routeName,
      outcome: known?.code ?? "unknown_error",
      requestId,
      error,
      metadata: {
        action: "first_admin_acceptance",
        error_code: known?.code ?? "unknown_error"
      }
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          "This account setup invitation is invalid or no longer active."
      },
      { status: known?.code === "membership_failed" ? 503 : 409 }
    );
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}
