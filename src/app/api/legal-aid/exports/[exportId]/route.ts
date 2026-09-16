import { NextResponse, type NextRequest } from "next/server";
import { legalAidErrorResponse, privateFileHeaders, staffActor, uuidOrThrow } from "@/lib/legal-aid/api";
import { openCaseFileExport } from "@/lib/legal-aid/case-file-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Downloads a recorded case-file export (PDF or JSON) for staff with the
// export permission on that application. The download is audited.
export async function GET(request: NextRequest, { params }: { params: Promise<{ exportId: string }> }) {
  try {
    const actor = await staffActor(request, { mutation: false });
    const { exportId } = await params;
    const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "pdf";
    const file = await openCaseFileExport(uuidOrThrow(exportId, "Export"), actor.authUserId, format);
    const headers = privateFileHeaders(file.filename, file.contentType, file.bytes.byteLength);
    headers["Content-Disposition"] = headers["Content-Disposition"].replace("inline;", "attachment;");
    return new NextResponse(Buffer.from(file.bytes), { status: 200, headers });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
