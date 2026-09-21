import "server-only";

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ConsumerRenderRouteObserver } from "@/lib/expungement-ai/consumer-render-request";
import {
  factoryV2RegistryCacheIsPopulated,
  factoryV2RouteFor,
  previewFactoryV2MigrationExists
} from "@/lib/rcap/documents/factory-v2-registry";
import { loadMsPaidConsumerSuccessor } from "@/lib/rcap/fulfillment/paid-consumer-successor";

const pathway = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const track = "ms-nonconv";

function probe(file: string, read: () => Buffer) {
  try {
    const bytes = read();
    return { path: file, exists: true, sha256: createHash("sha256").update(bytes).digest("hex"), readError: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return { path: file, exists: code === "ENOENT" || code === "ENOTDIR" ? false : null,
      sha256: null, readError: ["ENOENT", "ENOTDIR", "EACCES", "EISDIR"].includes(code ?? "") ? code : "unreadable" };
  }
}

/** TEMPORARY Target #4. Only the render POST handler installs this observer.
 * Before normal work: observe a boolean, never load the registry.
 * After normal resolution: inspect files and the already-established cache.
 * No snapshot, person/item identifiers, answers, error messages, cwd value,
 * credentials, or raw file contents are ever logged. Remove after diagnosis. */
export function createTarget4RenderDiagnostic(): ConsumerRenderRouteObserver | undefined {
  if (process.env.VERCEL_ENV !== "preview") return undefined;
  const cachePopulatedAtRequestEntry = factoryV2RegistryCacheIsPopulated();
  return (observation) => {
    if (process.env.VERCEL_ENV !== "preview" || observation.jurisdiction !== "MS"
      || observation.pathwayId !== pathway || observation.selectedTrackId !== track) return;
    const cachePopulatedAfterNormalResolution = factoryV2RegistryCacheIsPopulated();
    // Literal read paths keep the diagnostic's filesystem dependency closure bounded.
    const files = [
      probe("data/record-clearing/factory-v2-route-registry.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/factory-v2-route-registry.json"))),
      probe("data/record-clearing/legal-design-packet-set-manifests.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-packet-set-manifests.json"))),
      probe("data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json"))),
      probe("data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json"))),
      probe("data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json"))),
      probe("data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json"))),
      probe("data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json", () => fs.readFileSync(path.join(process.cwd(), "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json"))),
      probe("data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json"))),
      probe("data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json"))),
      probe("data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json"))),
      probe("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf"))),
      probe("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf"))),
      probe("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf", () => fs.readFileSync(path.join(process.cwd(), "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf")))
    ];
    const successor = loadMsPaidConsumerSuccessor();
    const migrationExistsOnFreshRead = previewFactoryV2MigrationExists(`MS:${pathway}`);
    // Never let observation become the first initializer of the registry.
    const factory = cachePopulatedAfterNormalResolution ? factoryV2RouteFor("MS", pathway, track) : null;
    console.info("rcap_target4_render_runtime", JSON.stringify({
      schemaVersion: "rcap-target4-render-runtime/v1",
      jurisdiction: "MS", pathwayId: pathway, selectedTrackId: track,
      files,
      paidSuccessor: { present: successor !== null, decisionId: successor?.decisionId ?? null },
      migrationExistsOnFreshRead,
      cachePopulatedAtRequestEntry,
      cachePopulatedAfterNormalResolution,
      factoryLookupPerformed: cachePopulatedAfterNormalResolution,
      factoryRoutePresent: factory !== null,
      cachedMigrationPresent: factory?.retiredLegacyRouteMigration != null,
      packetFamilyId: factory?.packetFamilyId ?? null,
      registryTrackIds: factory?.registryTrackIds ?? null,
      finalRouteKind: observation.routeKind
    }));
  };
}
