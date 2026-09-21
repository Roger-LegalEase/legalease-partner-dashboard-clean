// Read-only source/files API inspection. Source presence is NOT runtime presence.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  HOSTED_VERCEL_TEAM_ID as teamId,
  HOSTED_VERCEL_PROJECT_ID as projectId,
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

export const deploymentId = "dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe";
export const applicationSha = "884ad51d0ad50c520ec0ba2834eac03194ce88ac";
const root = fileURLToPath(new URL("../", import.meta.url));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

export async function inspectDeploymentFiles({ token, fetchImpl = fetch, expectedPaths, expectedBytes }) {
  if (!token) throw new Error("VERCEL_TOKEN_REQUIRED");
  const report = { deploymentId, applicationSha, teamId, projectId, requests: [],
    runtimePresence: "not_established_by_source_files_api", tree: [], dependencies: [] };
  async function get(endpoint) {
    const url = new URL(`https://api.vercel.com${endpoint}`);
    url.searchParams.set("teamId", teamId);
    const response = await fetchImpl(url, { method: "GET", redirect: "error",
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const raw = Buffer.from(await response.arrayBuffer());
    let json;
    try { json = JSON.parse(raw.toString("utf8")); } catch { /* Record shape, never raw content. */ }
    const receipt = { endpoint, httpStatus: response.status,
      contentType: response.headers.get("content-type"), responseByteCount: raw.length,
      responseSha256: sha256(raw), jsonShape: Array.isArray(json) ? "array" : typeof json,
      responseKeys: json && !Array.isArray(json) ? Object.keys(json) : [],
      errorCode: typeof json?.error?.code === "string" && /^[a-zA-Z0-9_-]+$/.test(json.error.code)
        ? json.error.code : null };
    report.requests.push(receipt);
    return { response, json, receipt };
  }
  const metadata = await get(`/v13/deployments/${deploymentId}`);
  const d = metadata.json;
  if (!metadata.response.ok || d?.id !== deploymentId || d?.projectId !== projectId
    || d?.gitSource?.sha !== applicationSha || d?.readyState !== "READY"
    || !(d?.target === null || d?.target === "preview")
    || d?.team?.id !== teamId) throw new Error("PINNED_PREVIEW_IDENTITY_MISMATCH");
  report.identityVerified = true;
  const listing = await get(`/v6/deployments/${deploymentId}/files`);
  if (!listing.response.ok || !Array.isArray(listing.json)) {
    report.outcome = "file_tree_unavailable_runtime_contents_unproven";
    return report;
  }
  function walk(nodes, parent = "") {
    for (const node of nodes) {
      if (typeof node.name !== "string") continue;
      const name = parent ? `${parent}/${node.name}` : node.name;
      report.tree.push({ path: name, type: node.type, uid: node.uid ?? null });
      if (Array.isArray(node.children)) walk(node.children, name);
    }
  }
  walk(listing.json);
  report.treeEntryCount = report.tree.length;
  report.buildOutputEntries = report.tree.filter((entry) =>
    /(^|\/)(\.next|\.vercel|__fn_[^/]+)(\/|$)|\.func(\/|$)|\.nft\.json$/.test(entry.path));
  for (const file of expectedPaths) {
    const entries = report.tree.filter((entry) => entry.path.replace(/^\/+/, "") === file);
    const row = { path: file, listedInSourceTree: entries.length === 1,
      runtimePresence: "unknown" };
    report.dependencies.push(row);
    if (entries.length !== 1 || !entries[0].uid) continue;
    const content = await get(`/v8/deployments/${deploymentId}/files/${encodeURIComponent(entries[0].uid)}?path=${encodeURIComponent(file)}`);
    row.contentHttpStatus = content.response.status;
    if (!content.response.ok) continue;
    // The documented response is JSON containing base64 file contents.
    const encoded = typeof content.json?.data === "string" ? content.json.data : content.json?.content;
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
      row.contentDecoding = "unrecognized_response_shape";
      continue;
    }
    const bytes = Buffer.from(encoded, "base64");
    row.sourceFileByteCount = bytes.length;
    row.sourceFileSha256 = sha256(bytes);
    row.frozenSourceSha256 = sha256(expectedBytes(file));
    row.matchesFrozenSource = row.sourceFileSha256 === row.frozenSourceSha256;
  }
  report.outcome = "source_files_inspected_runtime_contents_unproven";
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verifier = fs.readFileSync(path.join(root, "scripts/verify-ms-render-runtime-trace.mjs"), "utf8");
  const expectedPaths = [...verifier.matchAll(/^  "(data\/[^"\n]+)",$/gm)].map((match) => match[1]);
  if (expectedPaths.length !== 13 || new Set(expectedPaths).size !== 13) throw new Error("TARGET4_DENOMINATOR_MISMATCH");
  const out = path.join(root, "target4-deployment-files-evidence.json");
  try {
    const report = await inspectDeploymentFiles({ token: process.env.VERCEL_TOKEN, expectedPaths,
      expectedBytes: (file) => execFileSync("git", ["show", `${applicationSha}:${file}`],
        { cwd: root, maxBuffer: 16 * 1024 * 1024 }) });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ deploymentId, outcome: report.outcome, treeEntryCount: report.treeEntryCount,
      runtimePresence: report.runtimePresence, requests: report.requests.map(({ endpoint, httpStatus, errorCode }) =>
        ({ endpoint, httpStatus, errorCode })) }, null, 2));
  } catch {
    // Never print arbitrary upstream exception data or token-bearing objects.
    fs.writeFileSync(out, JSON.stringify({ deploymentId, outcome: "inspection_failed_no_runtime_conclusion" }));
    console.error("Target #4 read-only inspection failed; no runtime conclusion.");
    process.exitCode = 1;
  }
}
