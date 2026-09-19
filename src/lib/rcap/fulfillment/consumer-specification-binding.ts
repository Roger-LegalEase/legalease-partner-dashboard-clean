import "server-only";

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { GradeAFulfillmentRecord } from "@/lib/rcap/fulfillment/grade-a-authority";
import { stableStringify } from "@/lib/rcap/fulfillment/grade-a-registry";
import { composablePacketSpecificationFor, packetSpecificationForTrack } from "@/lib/rcap/grade-a/packet-specification";

/** Resolve metadata, never approval. The evaluator and observation decide that.
 * Compare the registered specification to its actual source bytes: its embedded
 * content hash and the registry's whole-file hash are different identities.
 */
export function consumerSpecificationBinding(
  record: GradeAFulfillmentRecord,
  binding?: { trackId?: string | null; packetFamilyId?: string | null }
) {
  const specification = composablePacketSpecificationFor(record.routeId);
  /*
   * A specification may name more than one route, and some do: the MS
   * additional-misdemeanor packet declares
   *   routeKeys: ["MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
   *               "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6"]
   * because one assembled packet serves both parallel courts. Comparing only
   * `specification.pathwayId` bound the first of those and refused the second,
   * so an owner-approved route could not bind the specification that authorizes
   * it — fail-closed under-delivery.
   *
   * The binding is still EXACT. It is satisfied only by a route the
   * specification itself names, read from the specification's own `routeKeys`.
   * Where a specification declares no `routeKeys` the singular `pathwayId`
   * remains the whole test, so no other family's binding changes. No
   * jurisdiction is special-cased and no pathway is added as a literal.
   */
  const declaredRoutes: string[] = Array.isArray((specification as { routeKeys?: unknown })?.routeKeys)
    ? ((specification as unknown as { routeKeys: string[] }).routeKeys)
    : [];
  const routeIsDeclared = declaredRoutes.length > 0
    ? declaredRoutes.includes(record.routeId)
    : specification?.pathwayId === record.pathwayId;
  if (!specification || !binding?.trackId || binding.trackId.includes("*")
    || packetSpecificationForTrack(record.routeId, binding.trackId) !== specification
    || specification.jurisdiction !== record.jurisdiction
    || !routeIsDeclared
    || specification.packetFamily !== record.packetFamilyId
    || (binding.packetFamilyId !== undefined && binding.packetFamilyId !== specification.packetFamily)
    || record.packetCompleteness?.specificationId !== specification.specificationId
    || record.packetCompleteness?.specificationVersion !== specification.specificationVersion
    || record.provider.providerId !== "ghcr.io/roger-legalease/rcap-render-worker"
    || record.provider.rendererKind !== "packet_document_v1") return null;

  const directory = "data/record-clearing/packet-specifications";
  try {
    for (const file of fs.readdirSync(path.join(process.cwd(), directory))) {
      if (!file.endsWith(".json")) continue;
      const relative = `${directory}/${file}`;
      const bytes = fs.readFileSync(path.join(process.cwd(), relative));
      if (createHash("sha256").update(bytes).digest("hex") !== record.packetSpecification.sha256) continue;
      if (stableStringify(JSON.parse(bytes.toString("utf8"))) === stableStringify(specification)) {
        return { specification, path: relative };
      }
    }
  } catch {
    // Missing source bytes are not an independently bound specification.
  }
  return null;
}
