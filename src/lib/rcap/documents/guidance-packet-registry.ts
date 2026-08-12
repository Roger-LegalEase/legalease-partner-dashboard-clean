import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * The runtime registry for lane-B complete-guidance treatments.
 *
 * Guidance packets are authored as data (data/rcap-all50/guidance-packets/*.json)
 * and reach the participant through the authoritative route resolver, never as
 * a sellable packet: relief on these tracks is automatic or otherwise not
 * user-filed, so there is nothing to sell and no credit to consume. Loading is
 * fail-closed — a packet that declares paymentAllowed or sellable as anything
 * but false is rejected at load, so a bad edit cannot quietly become a paid
 * product through this registry.
 */

export type GuidancePacketSummary = {
  trackId: string;
  jurisdiction: string;
  treatment: "complete_guidance";
  /** Compiled pathway ids this track is reachable through, when any exist. */
  compiledPathwayIds: string[];
  paymentAllowed: false;
  sellable: false;
};

const PACKET_DIR = "data/rcap-all50/guidance-packets";

/**
 * Track → compiled-pathway binding, from the crosswalk's candidate resolution
 * (data/rcap-ledger/track-pathway-crosswalk.json). Tracks with no compiled
 * runtime pathway (IL 2028 act, both AK tracks) are reachable only at the
 * jurisdiction level and bind to no pathway id.
 */
const TRACK_COMPILED_PATHWAYS: Record<string, string[]> = {
  mi_auto_misd92: ["automatic-clean-slate-set-aside-under-mcl-780-621g"],
  mi_auto_misd93: ["automatic-clean-slate-set-aside-under-mcl-780-621g"],
  "ca-auto-conviction": ["tool-2-automatic-relief"],
  "il-auto-seal-2028": [],
  "ak-nonconviction-confidential": [],
  "ak-sej": []
};

let cache: Map<string, GuidancePacketSummary[]> | null = null;

function loadAll(): Map<string, GuidancePacketSummary[]> {
  if (cache) return cache;
  const byJurisdiction = new Map<string, GuidancePacketSummary[]>();
  const dir = path.join(process.cwd(), PACKET_DIR);
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json") || file.startsWith("_")) continue;
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as {
        jurisdiction?: string;
        packets?: Array<{ trackId?: string; treatment?: string; paymentAllowed?: unknown; sellable?: unknown }>;
      };
      const jurisdiction = String(parsed.jurisdiction ?? "").toUpperCase();
      if (!jurisdiction) continue;
      for (const packet of parsed.packets ?? []) {
        if (packet.treatment !== "complete_guidance" || !packet.trackId) continue;
        if (packet.paymentAllowed !== false || packet.sellable !== false) {
          throw new Error(
            `Guidance packet ${packet.trackId} in ${file} does not declare paymentAllowed=false and sellable=false; refusing to register a guidance treatment that could be sold.`
          );
        }
        const summary: GuidancePacketSummary = {
          trackId: packet.trackId,
          jurisdiction,
          treatment: "complete_guidance",
          compiledPathwayIds: TRACK_COMPILED_PATHWAYS[packet.trackId] ?? [],
          paymentAllowed: false,
          sellable: false
        };
        const list = byJurisdiction.get(jurisdiction) ?? [];
        list.push(summary);
        byJurisdiction.set(jurisdiction, list);
      }
    }
  }
  cache = byJurisdiction;
  return byJurisdiction;
}

export function guidanceTracksForJurisdiction(jurisdiction: string): GuidancePacketSummary[] {
  return loadAll().get(jurisdiction.toUpperCase()) ?? [];
}

export function guidanceTracksForPathway(jurisdiction: string, pathwayId: string): GuidancePacketSummary[] {
  if (!pathwayId) return [];
  return guidanceTracksForJurisdiction(jurisdiction).filter((packet) => packet.compiledPathwayIds.includes(pathwayId));
}
