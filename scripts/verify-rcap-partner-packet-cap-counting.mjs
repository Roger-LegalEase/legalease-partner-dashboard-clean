import fs from "node:fs";
import path from "node:path";

// Proves the partner packet cap is counted on packet GENERATION only, once per
// packet, best-effort and fail-open, and is NOT counted at account creation,
// screening claim, or screening completion.
//
// NOTE: strict cap enforcement/reporting still requires the phase-39 Supabase
// migration (record_rcap_partner_packet_generation) to be applied in production.
// This verifier proves the application wiring only.

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const packetGen = read("src/lib/expungement-ai/packet-generation.ts");
const slotLifecycle = read("src/lib/expungement-ai/rcap-slot-lifecycle.ts");
const completeRoute = read("src/app/api/expungement-ai/screening/complete/route.ts");
const claimRoute = read("src/app/api/expungement-ai/screening/pending/claim/route.ts");

// 1. Cap counting is wired into packet generation.
assert(
  packetGen.includes("recordPartnerPacketUsage") && packetGen.includes("shouldConsumePartnerPacketCap"),
  "packet-generation.ts must import the partner cap helpers."
);
assert(
  packetGen.includes("await recordPartnerPacketCapUsage(item, isPartnerSponsored)"),
  "generatePaidConsumerPacket must record partner packet cap usage after generation."
);

// 2. It is gated to partner-covered items and to a genuine (not already-ready)
//    generation, and dedupes on the screening session id.
assert(
  packetGen.includes("shouldConsumePartnerPacketCap({ isPartnerCovered: isPartnerSponsored, packetWasAlreadyReady: false })"),
  "Cap usage must be gated by shouldConsumePartnerPacketCap for partner-covered generations only."
);
assert(
  packetGen.includes("recordPartnerPacketUsage(item.sourceSessionId)"),
  "Cap usage must key on the item's source screening session id."
);

// 3. Ordering: the already-ready early return must precede the cap call, so a
//    refresh/re-download never re-counts.
const genStart = packetGen.indexOf("export async function generatePaidConsumerPacket");
const alreadyReadyReturn = packetGen.indexOf('if (item.packetStatus === "ready" && existing)', genStart);
const capCall = packetGen.indexOf("await recordPartnerPacketCapUsage(item, isPartnerSponsored)", genStart);
assert(alreadyReadyReturn > -1 && capCall > -1 && alreadyReadyReturn < capCall,
  "The already-ready early return must come before the cap-usage call (no double count on re-download).");

// 4. Fail-open: the helper wraps the call in try/catch, checks !usage.ok without
//    throwing, and recordPartnerPacketUsage itself never throws.
const helperStart = packetGen.indexOf("async function recordPartnerPacketCapUsage");
// Bound to the helper's own closing brace (first column-0 "}" after the start).
const helper = packetGen.slice(helperStart, packetGen.indexOf("\n}", helperStart) + 2);
assert(helper.includes("try {") && helper.includes("catch (error)"), "recordPartnerPacketCapUsage must catch errors (fail-open).");
assert(!helper.includes("throw "), "recordPartnerPacketCapUsage must never throw (must not break packet generation).");
assert(helper.includes("if (!usage.ok)"), "recordPartnerPacketCapUsage must tolerate a non-ok cap result.");
assert(
  slotLifecycle.includes('supabase.rpc("record_rcap_partner_packet_generation"') &&
    /recordPartnerPacketUsage[\s\S]*?if \(error\) return \{ ok: false/.test(slotLifecycle),
  "recordPartnerPacketUsage must return { ok:false } (not throw) when the RPC is missing/errors."
);

// 5. shouldConsumePartnerPacketCap logic: partner-covered AND not already ready.
assert(
  slotLifecycle.includes("return input.isPartnerCovered && !input.packetWasAlreadyReady;"),
  "shouldConsumePartnerPacketCap must be isPartnerCovered && !packetWasAlreadyReady."
);

// 6. Non-counting events: screening completion consumes the session (status
//    flip) but does NOT record packet cap; account claim does not either.
assert(
  completeRoute.includes("consumeRcapScreeningSession") && !completeRoute.includes("recordPartnerPacketUsage"),
  "Screening completion must consume the session but must not record packet cap usage."
);
assert(
  !claimRoute.includes("recordPartnerPacketUsage"),
  "Account/pending-claim must not record packet cap usage."
);

// 7. The only caller of recordPartnerPacketUsage is the packet-generation path.
for (const [file, source] of [
  ["screening/complete route", completeRoute],
  ["pending/claim route", claimRoute]
]) {
  assert(!source.includes("recordPartnerPacketUsage"), `${file} must not call recordPartnerPacketUsage.`);
}

if (failures.length > 0) {
  console.error("RCAP partner packet-cap counting verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner packet-cap counting verifier passed.");
console.log("Cap is recorded once on partner packet generation (fail-open, deduped on session); account creation, claim, and screening do not count.");
console.log("Reminder: strict production enforcement/reporting requires the phase-39 migration to be applied.");
