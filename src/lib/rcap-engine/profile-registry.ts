import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { EngineProfile, PublicJurisdictionProfile } from "@/lib/rcap-engine/contracts";

const compiledRoot = path.join(process.cwd(), "src/lib/rcap-engine/compiled");
const profilesRoot = path.join(compiledRoot, "profiles");

let profileCache: EngineProfile[] | undefined;
let designerPublicCache: Record<string, PublicJurisdictionProfile> | undefined;

let jurisdictionNameIndex: Map<string, string> | undefined;

/** Letters only, upper case — the one shape both a code and a name reduce to. */
function letterKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * UX-GLOBAL-014 — the human-readable form of a jurisdiction resolves.
 *
 * This normalizer stripped non-letters and then matched two-letter codes, so
 * `/expungement-ai/screening/mississippi` normalized to MISSISSIPPI, matched
 * nothing, and the profile route answered 404 unsupported_jurisdiction, which
 * the screening flow renders as its missing-profile dead end. District of
 * Columbia was the sole exception, because it was special-cased by hand. The
 * repository's own witness ledger records every publicRoute in exactly this
 * slug form, so the recorded route was unreachable for 50 of 51 jurisdictions.
 *
 * The index is built from the compiled profiles' own jurisdiction names rather
 * than a second hand-maintained list, so a jurisdiction cannot be added to the
 * engine and left unreachable by name. "Washington DC" keeps its alias because
 * it is not the compiled name.
 */
function getJurisdictionNameIndex() {
  if (!jurisdictionNameIndex) {
    jurisdictionNameIndex = new Map<string, string>([["WASHINGTONDC", "DC"]]);
    for (const profile of getAllJurisdictionProfiles()) {
      const code = profile.jurisdiction.code.toUpperCase();
      const name = letterKey(profile.jurisdiction.name ?? "");
      if (name.length > 2 && !jurisdictionNameIndex.has(name)) jurisdictionNameIndex.set(name, code);
    }
  }
  return jurisdictionNameIndex;
}

export function normalizeJurisdictionCode(value: string) {
  const normalized = letterKey(value);
  if (normalized.length === 2) return normalized;
  return getJurisdictionNameIndex().get(normalized) ?? normalized;
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
