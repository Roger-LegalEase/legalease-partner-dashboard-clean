import type { EngineProfile } from "@/lib/rcap-engine/contracts";

const CLOSE = { relativePath: "LegalEase North Dakota/Close-Nonconviction-Records.pdf", sha256: "21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f" };
const EXPUNGEMENT = { relativePath: "LegalEase North Dakota/Expungement.pdf", sha256: "40fd33d0fece1fe31587208a22e549f816c24f71c00c71b4a1d76409109f930f" };
const UNMAPPED: Record<string, typeof CLOSE[]> = {
  "general-conviction-sealing-under-n-d-c-c-chapter-12-60-1": [CLOSE],
  "deferred-imposition-dismissal-and-sealing": [CLOSE],
  "marijuana-specific-summary-pardon-or-sealing-relief": [CLOSE, EXPUNGEMENT],
};

// ND WRONG_FORM: these exact positional candidates are not these routes' instruments.
// Marijuana remains custom/manual until the SFN-61663 census set is wired into compiled custody.
// shortcut: drafts retain historical packetFamilyIdentifiers; refresh them before adding an unscoped identity comparison.
export function isNorthDakotaUnmappedCandidateForm(profile: EngineProfile, pathwayId: string): boolean {
  const plan = profile.packetGenerator.pathways.find(candidate => candidate.pathwayId === pathwayId);
  const expected = UNMAPPED[pathwayId];
  return profile.jurisdiction.code === "ND" && Boolean(expected)
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7"
    && plan?.mode === "official_form_overlay_or_source_form_set" && plan.formMappingStatus === "source_candidate_identified"
    && JSON.stringify((plan.formCandidates ?? []).map(candidate => ({ relativePath: candidate.relativePath, sha256: candidate.sha256 }))) === JSON.stringify(expected);
}
