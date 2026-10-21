#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { prepareWashingtonCourtInitiatedGuidance, WASHINGTON_GUIDANCE_DIRECTORY } from "./grade-a-packet-factory-24h/washington-court-initiated-guidance.mjs";
import { WA_AUTOMATIC, WA_GUIDANCE_ROUTES } from "./grade-a-packet-factory-24h/treatment-reconciliation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation";
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

export function buildWashingtonCourtInitiatedGuidance({ checkOnly = false } = {}) {
  const diagnostics = JSON.parse(fs.readFileSync(path.join(root, evidence, "wa-guidance-build.json"), "utf8"));
  if (diagnostics.familyId !== WA_AUTOMATIC) throw new Error("Wrong Washington fixture family");
  const outputs = [];
  const emit = (relative, content) => {
    const absolute = path.join(root, relative);
    if (checkOnly) {
      if (!fs.existsSync(absolute) || !fs.readFileSync(absolute).equals(Buffer.from(content))) {
        throw new Error(`Washington guidance output is stale: ${relative}`);
      }
    } else {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, content);
    }
  };
  for (const fixture of diagnostics.cases) {
    const prepared = prepareWashingtonCourtInitiatedGuidance(fixture.input);
    if (prepared.documents.length !== 1 || prepared.status !== fixture.expectedStatus) {
      throw new Error(`Washington guide fixture no longer matches its expected branch: ${fixture.fixture}`);
    }
    const text = prepared.documents[0].text;
    const relative = `${WASHINGTON_GUIDANCE_DIRECTORY}/guides/${fixture.fixture}.md`;
    emit(relative, text);
    outputs.push({ fixture: fixture.fixture, path: relative, sha256: sha(text), byteLength: Buffer.byteLength(text),
      routeKey: prepared.routeKey, status: prepared.status, mediaType: "text/markdown",
      stageId: prepared.routeKey.split(":").at(-1), documentId: "court_initiated_status_guide" });
  }
  const inputPaths = [
    "scripts/grade-a-packet-factory-24h/washington-court-initiated-guidance.mjs",
    "scripts/grade-a-packet-factory-24h/treatment-reconciliation.mjs",
    "scripts/build-census-v1-census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260.mjs",
    `${evidence}/wa-guidance-build.json`,
    `${evidence}/wa-13-50-260.html.gz`,
    "data/rcap-grade-a/chat-parallel-2026-09-07/chat6-source-legal/group-02-wa-guidance-ut-custody.json"
  ];
  const manifest = {
    schemaVersion: "rcap-scoped-guidance-build/v1", familyId: WA_AUTOMATIC,
    implementationStrategy: "process_guidance", directory: WASHINGTON_GUIDANCE_DIRECTORY,
    routeKeys: WA_GUIDANCE_ROUTES,
    inputs: inputPaths.map(relative => ({ path: relative, sha256: sha(fs.readFileSync(path.join(root, relative))) })),
    outputs, requiredOutputKind: "text/markdown", participantFilesGeneratedOutput: false,
    petitionPrepared: false, sealingConfirmed: false,
    independentAcceptance: "PENDING", runtimeInstalled: false, commercialAuthority: false
  };
  emit(`${WASHINGTON_GUIDANCE_DIRECTORY}/guidance-manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildWashingtonCourtInitiatedGuidance({ checkOnly: process.argv.includes("--check") });
  console.log(`Washington court-initiated guidance ${process.argv.includes("--check") ? "checked" : "built"}: ${manifest.outputs.length} Markdown outputs; independent acceptance pending; runtime not installed.`);
}
