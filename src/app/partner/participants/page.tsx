import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
// The canonical Activity & Reporting page authenticates and scopes every read.
export default function Participants() { redirect("/partner/reporting"); }
