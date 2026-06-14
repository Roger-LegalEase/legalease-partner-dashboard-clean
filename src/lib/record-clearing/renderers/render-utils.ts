import crypto from "node:crypto";
import fs from "node:fs";
import type { OfficialPdfTemplate } from "../types";

export function hashFile(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function safeOutputFileName(template: OfficialPdfTemplate, suffix: string): string {
  return `${template.jurisdictionCode}-${template.formNumber.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${suffix}.pdf`;
}
