import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requiredHostedCases } from "./rcap-hosted-surface-inspection.mjs";

export function hostedEvidenceFailures({ documents, required, binding, checkoutRequired = true }) {
  const failures = [];
  const check = (ok, id) => { if (!ok) failures.push(id); };
  for (const [file, ids] of Object.entries(required)) {
    if (file === "checkout-gate.json" && !checkoutRequired) continue;
    const doc = documents[file];
    check(Boolean(doc), `${file}: evidence missing`);
    check(doc?.passed === true, `${file}: did not earn PASS`);
    for (const id of ids) check(doc?.cases?.[id]?.passed === true, `${file}:${id}: missing or failing verdict`);
    for (const [id, verdict] of Object.entries(doc?.cases ?? {})) {
      check(verdict.passed === true, `${file}:${id}: nonpassing verdict`);
    }
    check(!doc?.failedCases?.length && !doc?.missingCases?.length, `${file}: reports incomplete cases`);
    check(doc?.applicationSha === binding.applicationSha, `${file}: application identity mismatch`);
  }
  for (const file of ["checkout-gate.json", "matrix.json", "payment.json"]) {
    if (file === "checkout-gate.json" && !checkoutRequired) continue;
    const doc = documents[file];
    check(doc?.acceptanceProjectRef === binding.acceptanceProjectRef, `${file}: acceptance project mismatch`);
  }
  const checkout = documents["checkout-gate.json"];
  const payment = documents["payment.json"];
  const gallery = documents["gallery.json"];
  check(documents["matrix.json"]?.workerDigestRef === binding.workerDigestReference, "matrix.json: worker digest mismatch");
  check(payment?.worker?.image === binding.workerDigestReference, "payment.json: worker digest mismatch");
  check(payment?.previewDeploymentId === gallery?.previewDeploymentId && /^dpl_/.test(payment?.previewDeploymentId ?? ""), "payment/gallery: Preview mismatch");
  if (checkoutRequired) {
    check(checkout?.workerDigest === binding.workerDigest, "checkout-gate.json: worker digest mismatch");
    check(checkout?.deployment?.id === payment?.previewDeploymentId, "checkout/payment: Preview mismatch");
  }
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const directory = process.env.HOSTED_ACCEPTANCE_EVIDENCE_DIR || "hosted-acceptance-evidence";
  const fixture = JSON.parse(fs.readFileSync(path.join(directory, "stripe-fixtures.json"), "utf8"));
  if (fixture.ok !== true || !/^prod_/.test(fixture.productId ?? "")) throw new Error("exact successful catalog fixture receipt required");
  const required = requiredHostedCases(root, fixture.productId);
  const documents = Object.fromEntries(Object.keys(required).map(file => {
    try { return [file, JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"))]; }
    catch { return [file, null]; }
  }));
  const binding = JSON.parse(fs.readFileSync("data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json", "utf8"));
  const failures = hostedEvidenceFailures({ documents, required, binding, checkoutRequired: process.env.REQUIRE_CHECKOUT_GATE !== "false" });
  if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
  else console.log("PASS: every required emitted verdict and application/worker/Preview identity agrees");
}
