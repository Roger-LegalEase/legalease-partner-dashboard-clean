import { NextResponse } from "next/server";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ sessionId: string }>;
  }
) {
  const { sessionId } = await params;
  const session = await getRcapIntakeSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Intake session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}
