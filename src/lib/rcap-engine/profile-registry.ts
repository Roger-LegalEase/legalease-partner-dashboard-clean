import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { EngineProfile, PublicJurisdictionProfile } from "@/lib/rcap-engine/contracts";

const compiledRoot = path.join(process.cwd(), "src/lib/rcap-engine/compiled");
const profilesRoot = path.join(compiledRoot, "profiles");

let profileCache: EngineProfile[] | undefined;
let designerPublicCache: Record<string, PublicJurisdictionProfile> | undefined;

export function normalizeJurisdictionCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized === "WASHINGTONDC" || normalized === "DISTRICTOFCOLUMBIA") return "DC";
  return normalized;
}

export function getAllJurisdictionProfiles() {
  if (!profileCache) {
    profileCache = fs
      .readdirSync(profilesRoot)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => JSON.parse(fs.readFileSync(path.join(profilesRoot, file), "utf8")) as EngineProfile);
  }
  return profileCache;
}

export function getProfileByJurisdiction(jurisdiction: string) {
  const code = normalizeJurisdictionCode(jurisdiction);
  return getAllJurisdictionProfiles().find((profile) => profile.jurisdiction.code.toUpperCase() === code);
}

export function assertProfileVersion(profile: EngineProfile, profileVersion: string) {
  if (profile.profileVersion !== profileVersion) {
    return {
      ok: false as const,
      currentProfileVersion: profile.profileVersion
    };
  }
  return { ok: true as const };
}

export function getDesignerPublicProfiles() {
  if (!designerPublicCache) {
    designerPublicCache = JSON.parse(fs.readFileSync(path.join(compiledRoot, "all51.json"), "utf8")) as Record<string, PublicJurisdictionProfile>;
  }
  return designerPublicCache;
}

export function getDesignerIllinoisProfile() {
  return JSON.parse(fs.readFileSync(path.join(compiledRoot, "IL.json"), "utf8")) as PublicJurisdictionProfile;
}

export function getCompiledReport(name: "packet-build-summary.json" | "all51-final-validation.json") {
  return JSON.parse(fs.readFileSync(path.join(compiledRoot, name), "utf8")) as unknown;
}
