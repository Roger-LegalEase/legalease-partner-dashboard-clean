import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";

const nationwideZipPath = path.join(process.cwd(), ".codex-inputs/LegalEase_RCAP_All51_Codex_Build_Kit_2026-06-19/Nationwide Record Clearing .zip");

export function profileSourceReferenceCount(profile: EngineProfile) {
  return (profile.source?.references ?? []).length + (profile.source?.allFolderFiles ?? []).length;
}

export function compiledProfileHash(profile: EngineProfile) {
  return crypto.createHash("sha256").update(JSON.stringify(profile)).digest("hex");
}

export function sourceArchiveAvailable() {
  return fs.existsSync(nationwideZipPath);
}
