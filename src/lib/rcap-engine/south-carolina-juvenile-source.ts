import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const SC_JUVENILE_ROUTE = "SC:juvenile-expungement";
export const SC_JUVENILE_SOURCE = {
  fileName: "SCCA492.pdf",
  relativePath: "LegalEase South Carolina /SCCA492.pdf",
  sha256: "f3ca97547842f877d288fec3155331684d5a7199283c2b9d27cf34664409652f",
  sizeBytes: 321133,
  pages: 3,
  edition: "7/2019",
  officialUrl: "https://www.sccourts.org/forms/pdf/SCCA492.pdf"
} as const;
const PATHWAY = "juvenile-expungement";
const FAMILY = "South Carolina Juvenile Expungement Application under § 63-19-2050";

/** Correct the instrument only. Existing rules, holds and LD-SC-01 authority remain unchanged. */
export function withSouthCarolinaJuvenileSource(profile: EngineProfile): EngineProfile {
  if (profile.jurisdiction.code !== "SC") return profile;
  const pathway = profile.pathways.find(p=>p.id===PATHWAY);
  const generator = profile.packetGenerator.pathways.find(p=>p.pathwayId===PATHWAY);
  if (!pathway && !generator) return profile;
  if (profile.profileVersion !== "2026-06-19-source-conversion-1" || !pathway || !generator
    || pathway.legalAuthority?.decisionId !== "LD-SC-01"
    || pathway.legalAuthority.statute !== "S.C. Code § 63-19-2050"
    || pathway.legalAuthority.packetFamily !== FAMILY) {
    throw new Error("SC juvenile instrument requires the exact existing LD-SC-01 juvenile scope");
  }
  const sources = profile.source?.allFolderFiles?.filter(s=>s.fileName===SC_JUVENILE_SOURCE.fileName) ?? [];
  const source = sources[0];
  if (sources.length !== 1 || source.sha256 !== SC_JUVENILE_SOURCE.sha256
    || source.sizeBytes !== SC_JUVENILE_SOURCE.sizeBytes
    || source.relativePath !== SC_JUVENILE_SOURCE.relativePath
    || source.extension !== ".pdf" || source.kind !== "official_form_or_packet") {
    throw new Error("SC juvenile instrument requires the exact existing three-page SCCA492 source");
  }
  return {...profile, packetGenerator:{...profile.packetGenerator,
    pathways:profile.packetGenerator.pathways.map(p=>p.pathwayId!==PATHWAY?p:{...p,
      formCandidates:[structuredClone(source)],
      selectionRule:"Use all three pages of the existing SCCA492 juvenile motion and order under section63-19-2050, through the Circuit Solicitor for Family Court. The previous SCCA223E/SCCA223D1 candidate pair and adult summary-court package do not establish this juvenile procedure. Prepare only participant-owned facts; leave solicitor consent/signature, DJJ/SLED verification, hearing/judge/order findings and SLED internal execution blank. Actual completion proof remains external, never fabricated or described as attached. Preserve the statutory not-guilty age/fee exception and every existing eligibility, source, packet, commercial and release hold. This selection does not create a registry track, family approval or verified packet."
    })
  }};
}
