import assert from "node:assert/strict";
import test from "node:test";
import { inspectDeploymentFiles, deploymentId, applicationSha } from "./rcap-target4-deployment-files.mjs";
const teamId = "team_4qLmZK9WI6xIy5vjYC0IF3ae";
const metadata = { id: deploymentId, projectId: "prj_cdgwGzFqIHgEUlzEburSLaZETdQV",
  team: { id: teamId }, gitSource: { sha: applicationSha }, readyState: "READY", target: null };
const token = "test-held-credential";
test("only pinned GETs; source bytes never establish runtime presence or expose content", async () => {
  const requests = [];
  const report = await inspectDeploymentFiles({ token, expectedPaths: ["data/proof.json"],
    expectedBytes: () => Buffer.from("private-file-content"),
    fetchImpl: async (url, options) => {
      assert.equal(url.origin, "https://api.vercel.com");
      assert.equal(url.searchParams.get("teamId"), teamId);
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      requests.push(url.pathname);
      return Response.json(requests.length === 1 ? metadata : requests.length === 2
        ? [{ name: "data", type: "directory", children: [{ name: "proof.json", type: "file", uid: "file-id" }] }]
        : { data: Buffer.from("private-file-content").toString("base64") });
    } });
  assert.deepEqual(requests, [`/v13/deployments/${deploymentId}`, `/v6/deployments/${deploymentId}/files`,
    `/v8/deployments/${deploymentId}/files/file-id`]);
  assert.equal(report.dependencies[0].matchesFrozenSource, true);
  assert.equal(report.dependencies[0].runtimePresence, "unknown");
  assert.ok(!JSON.stringify(report).includes(token));
  assert.ok(!JSON.stringify(report).includes("private-file-content"));
});
test("wrong deployment identity stops before files reads", async () => {
  let calls = 0;
  await assert.rejects(inspectDeploymentFiles({ token, expectedPaths: [], fetchImpl: async () => {
    calls++;
    return Response.json({ ...metadata, target: "production" });
  } }), /PINNED_PREVIEW_IDENTITY_MISMATCH/);
  assert.equal(calls, 1);
});
test("unavailable file tree never becomes a missing-runtime-file claim", async () => {
  let calls = 0;
  const report = await inspectDeploymentFiles({ token, expectedPaths: ["data/proof.json"], fetchImpl: async () =>
    ++calls === 1 ? Response.json(metadata) : Response.json({ error: { code: "not_found" } }, { status: 404 }) });
  assert.equal(report.outcome, "file_tree_unavailable_runtime_contents_unproven");
  assert.equal(report.runtimePresence, "not_established_by_source_files_api");
});
