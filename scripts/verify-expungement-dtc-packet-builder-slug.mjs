import fs from "node:fs";
import path from "node:path";
import { partnerPacketInformationActionPath } from "../src/lib/expungement-ai/partner-packet-links.ts";

// Proves the partner packet-builder link is derived from the item's actual
// sponsoring partner (never a hardcoded slug), that DTC packets do not route
// through a partner form, and that DTC vs partner packet CTAs stay distinct.

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

// 1. Executable link builder: partner slug is preserved verbatim.
const wmv = partnerPacketInformationActionPath("we-must-vote", "item-1");
assert(
  wmv === "/documents/we-must-vote/form?briefcaseItemId=item-1",
  `we-must-vote item should route to its own form, got: ${wmv}`
);
const other = partnerPacketInformationActionPath("second-chance-coalition", "item-2");
assert(
  other === "/documents/second-chance-coalition/form?briefcaseItemId=item-2",
  `Non-WMV partner should route to its own form, got: ${other}`
);
assert(!other.includes("we-must-vote"), "A non-WMV partner packet link must not contain we-must-vote.");

// 2. The hardcoded we-must-vote form path is gone from packet generation.
const packetGen = read("src/lib/expungement-ai/packet-generation.ts");
assert(
  !packetGen.includes("/documents/we-must-vote/form"),
  "packet-generation.ts must not hardcode /documents/we-must-vote/form."
);
assert(
  packetGen.includes("partnerPacketInformationActionPath("),
  "packet-generation.ts must build the partner form link via partnerPacketInformationActionPath."
);
assert(
  /buildMississippiPacketInformationArtifact\(item: ConsumerBriefcaseItem, partnerSlug: string\)/.test(packetGen),
  "buildMississippiPacketInformationArtifact must take an explicit partnerSlug."
);

// 3. The MS packet-information form is partner-gated and fails closed (no generic
//    fallback slug) when a sponsoring partner cannot be resolved.
assert(
  packetGen.includes("await assertMississippiPartnerPacketReady(userId, item)"),
  "attachMississippiPacketInformationRequest must assert the item is partner-sponsored."
);
assert(
  packetGen.includes("const partnerSlug = await partnerSlugForPacketItem(item)"),
  "attachMississippiPacketInformationRequest must resolve the sponsoring partner slug."
);
assert(
  /if \(!partnerSlug\) \{\s*throw new ConsumerPacketGenerationError/.test(packetGen),
  "A missing partner slug must throw (fail closed), not fall back to a default partner."
);

// 4. DTC paid packets use the download artifact, never a partner form action path.
const dtcArtifact = packetGen.slice(
  packetGen.indexOf("function buildConsumerPacketArtifact"),
  packetGen.indexOf("function buildMississippiPacketInformationArtifact")
);
assert(dtcArtifact.length > 0, "Could not locate buildConsumerPacketArtifact for DTC distinctness check.");
assert(
  dtcArtifact.includes('source: "source_driven_packet_plan"') && dtcArtifact.includes("downloadPath:"),
  "DTC packet artifact must be a source-driven download packet."
);
assert(
  !dtcArtifact.includes("we-must-vote") && !dtcArtifact.includes("actionPath"),
  "DTC packet artifact must not reference we-must-vote or a partner form actionPath."
);

// 5. Slug resolver reads the session's partner_slug and is DTC-safe (null when
//    there is no partner session).
const briefcase = read("src/lib/expungement-ai/briefcase.ts");
assert(
  /export async function partnerSlugForPacketItem/.test(briefcase),
  "briefcase.ts must export partnerSlugForPacketItem."
);
assert(
  briefcase.includes('.select("partner_slug")') && briefcase.includes("if (!item.sourceSessionId) return null"),
  "partnerSlugForPacketItem must select partner_slug and return null for DTC items with no session."
);

if (failures.length > 0) {
  console.error("Expungement.ai DTC packet-builder slug verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai DTC packet-builder slug verifier passed.");
console.log("Partner packet links use the item's real sponsoring partner; DTC packets stay on the source-driven download path; no hardcoded we-must-vote slug.");
