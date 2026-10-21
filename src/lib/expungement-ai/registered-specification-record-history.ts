import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";

// GA-17 (R2): registered-specification routes whose reviewed specification binds no record_type and whose profile asks no
// record_type question. Disposition, juvenile status, conviction and remedy facts stay separate route inputs; the inherited
// overlapping menu is optional literal history. Pins are the complete profile and specification: a new consumer fails closed.
const REGISTERED_RECORD_HISTORY: Readonly<Record<string, { profileHash: string; specificationHash: string }>> = {
  // GA17 Q-269179a67ce87233db32
  "DC:dc_actual_innocence_expungement_16_803": { profileHash: "bcc070d365fb97ad2cd7a5296ca4c8ba516dcf37708fb2b5c852c0d5d1566830",
    specificationHash: "e996552f778a29335da79c309cf319b8fcd4560a47c6db15b4a77a454372dc83" },
  // GA17 Q-261c55d6fca7e08a1d53
  "GA:restriction-and-sealing-of-a-pardoned-felony": { profileHash: "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef",
    specificationHash: "189730913a14c05abfa818fafbf3849714ca3439b55d097b73a53bbac082c67f" },
  // GA17 Q-454f8f18cea8461fc1bc
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing": { profileHash: "2c60e17a1f424dc325d41bd3533fbf5e10ed8e65316c1920fb809faea4b07cef",
    specificationHash: "7a568c20fa4099ee03bceb3cafd31b306e534d0a3b306c37afb1bb72a65c8ec3" },
  // GA17 Q-5bf2bfb3d4bfaebe6171
  "IL:criminal-identity-theft-mistaken-identity-relief": { profileHash: "b16978a1748ee80363763340a864f5ea8a2a5160bb8f76093440c02beda70afd",
    specificationHash: "e2407963972350e6bca336f1efd55d1e26a2eb51055f8f3cb4c6696ecd474c2b" },
  // GA17 Q-1ae6c0a67948d46499fd
  "IL:felony-prostitution-relief": { profileHash: "b16978a1748ee80363763340a864f5ea8a2a5160bb8f76093440c02beda70afd",
    specificationHash: "57a02cd4a796ba6f76f15dcb54b72d57ef89260e89d4b8e55178b096f244af66" },
  // GA17 Q-5ccf7411659316d7432d
  "NV:probation-or-specialty-court-dismissal-set-aside-sealing": { profileHash: "964eecfe7a5c3ffd4bae54636520141ff20d25c904401b4eab6941de5d3dd651",
    specificationHash: "94ed0589dab1e02886759605f2eac2afd4baf7bb3f0a1f6d4f18fcb24603182c" },
  // GA17 Q-ed913e13baeea013621d
  "SD:suspended-imposition-of-sentence-sealing": { profileHash: "a1d4f1e781a618726d83137b3905ec17ab394dbc31f94aee23273746ec8331c1",
    specificationHash: "7a6064a51c32017d01888cce0e439f3f3d7fe946bdaac5900a866319dee4e2df" },
  // GA17 Q-979dc4b69087b8d8c904
  "VA:regime-1-expungement-available-now": { profileHash: "8b9e5e8eb7100788dae197f75a552d4e831918fc11d5fa74218652c1f8a7ca1c",
    specificationHash: "1a86cdc4709753cb09fa4753a700f18a37feb4b9a6094a46f2db2e6244fe501e" },
};

export function registeredSpecificationRecordIsHistory(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined): boolean {
  const key = `${profile?.jurisdiction.code ?? ""}:${pathwayId ?? ""}`;
  const pin = Object.hasOwn(REGISTERED_RECORD_HISTORY, key) ? REGISTERED_RECORD_HISTORY[key] : undefined;
  return Boolean(pin && specification?.routeKey === key
    && contactRepresentationHash(profile) === pin.profileHash
    && contactRepresentationHash(specification) === pin.specificationHash);
}
