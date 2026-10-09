import Link from "next/link";
import { ClinicText } from "@/components/clinic-mode/ClinicText";

export default function ClinicNotOpen() {
  return <main className="min-h-screen bg-[#FBF7F2] px-4 py-16 text-[#0F1E3D]">
    <section className="mx-auto max-w-xl rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold"><ClinicText value="This clinic is not open" /></h1>
      <p className="mt-4"><ClinicText value="Ask clinic staff for the current event link and schedule." /></p>
      <Link href="/clinic" className="mt-5 inline-flex min-h-11 items-center font-bold underline"><ClinicText value="Return to clinic entry" /></Link>
    </section>
  </main>;
}
