import { NextResponse } from "next/server";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "Clear-Site-Data": '"cache"',
  Expires: "0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer"
};

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/sign-in", request.url), {
    status: 303,
    headers: NO_STORE_HEADERS
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const switchingAccount = form?.get("intent") === "switch-account";
  const supabase = await createServerSupabaseAuthClient();
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    logSecurityWarn({
      event: "sign-out failed",
      route: "/sign-out",
      outcome: "error",
      error,
      metadata: { auth_user_id: data.user?.id }
    });
    return NextResponse.json(
      { ok: false, error: "The session could not be signed out. Try again." },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  logSecurityInfo({
    event: "sign-out",
    route: "/sign-out",
    outcome: "signed_out",
    metadata: { auth_user_id: data.user?.id }
  });
  const destination = switchingAccount ? "/sign-in?switchAccount=1" : "/sign-in?signedOut=1";
  return NextResponse.redirect(new URL(destination, request.url), {
    status: 303,
    headers: NO_STORE_HEADERS
  });
}
