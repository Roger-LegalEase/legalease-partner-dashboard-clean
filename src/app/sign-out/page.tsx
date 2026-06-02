import Link from "next/link";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function SignOutPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="blue">Your Briefcase</Badge>
          <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
            <LogOut className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-black text-navy">Signed out placeholder</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            Once production auth is connected, this route will end the Briefcase session. Do not use a shared device without signing out.
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white">
            Back home
          </Link>
        </Card>
      </div>
    </main>
  );
}
