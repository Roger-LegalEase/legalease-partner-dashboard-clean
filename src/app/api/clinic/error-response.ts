import { NextResponse } from "next/server";
import { ClinicServiceError } from "@/lib/clinic-mode/service";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";

export function clinicErrorResponse(error: unknown) {
  if (error instanceof ClinicValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof ClinicServiceError) {
    const status = error.code === "unauthenticated" ? 401
      : error.code === "forbidden" ? 403
      : error.code === "not_found" ? 404
      : error.code === "conflict" ? 409
      : 503;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  return NextResponse.json({ success: false, error: "Clinic Mode request failed." }, { status: 500 });
}
