import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { stableStringify } from "./grade-a-registry";
import { evaluateStaticRenderAuthority, type GradeAFulfillmentRecord, type FulfillmentObservation } from "./grade-a-authority";
import { consumerSpecificationBinding } from "./consumer-specification-binding";

/** Called only after a worker claim and protected verification were validated.
 * An absent manifest never falls back to commercial or historical authority. */
export function workerStaticPacketBinding(routeId: string, trackId: string | null | undefined) {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/rcap-grade-a/worker-static-authority.json'), 'utf8'));
    if (doc.schemaVersion !== 'rcap-worker-static-authority/v1' || !Array.isArray(doc.entries)) return null;
    const matches = doc.entries.filter((e: {record: GradeAFulfillmentRecord}) => e.record.routeId === routeId);
    if (matches.length !== 1) return null;
    const entry = matches[0] as {record: GradeAFulfillmentRecord; observation: FulfillmentObservation; sha256:string};
    const hash = createHash('sha256').update(stableStringify({record:entry.record,observation:entry.observation})).digest('hex');
    if (hash !== entry.sha256 || !evaluateStaticRenderAuthority(entry.record, entry.observation).allowed) return null;
    const bound = consumerSpecificationBinding(entry.record, {trackId});
    if (!bound) return null;
    return { packetSpecificationSha256: bound.specification.specificationSha256 ?? entry.record.packetSpecification.sha256,
      packetSpecificationFileSha256: entry.record.packetSpecification.sha256 };
  } catch { return null; }
}
