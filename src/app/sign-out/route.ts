import { redirect } from "next/navigation";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";

export async function GET() {
  redirect("/sign-in");
}

export async function POST() {
  const supabase = await createServerSupabaseAuthClient();
  await supabase.auth.signOut();
  redirect("/sign-in?signedOut=1");
}
