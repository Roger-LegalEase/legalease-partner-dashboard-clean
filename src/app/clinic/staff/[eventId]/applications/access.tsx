import "server-only";
import { redirect } from "next/navigation";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";

export async function staffOrRedirect(next: string) {
  try { return await resolveSessionPartner(); }
  catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") redirect(`/sign-in?next=${encodeURIComponent(next)}`);
    throw new ClinicServiceError("forbidden", "Staff access is denied.");
  }
}

export function Denied({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#FBFAFC] px-4 py-20"><div className="mx-auto max-w-xl rounded-xl border border-[#E8E1EE] bg-white p-7"><h1 className="text-2xl font-black text-[#1E1129]">Clinic access denied</h1><p className="mt-3 text-sm leading-6 text-[#5B4E66]">{message}</p></div></main>;
}
