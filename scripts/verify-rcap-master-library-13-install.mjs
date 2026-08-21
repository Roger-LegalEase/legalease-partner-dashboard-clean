#!/usr/bin/env node
// The install-and-rehash contract the thirteen depend on.
//
//   node scripts/verify-rcap-master-library-13-install.mjs
//
// `generate-rcap-master-library-13.mjs --build` ends by unzipping each pack into
// an empty directory, running its own install.sh, and re-hashing every file that
// landed. That last step is the one that cannot be checked by reading the
// manifest, because it is about what reached disk. This proves the round trip on
// a synthetic pack: a clean install re-hashes correctly, and a pack whose bytes
// were changed after it was built is refused rather than installed.
//
// The synthetic pack is never a stand-in for the Master Library. It lives in a
// temp directory, its bytes are obviously not a court form, and nothing it
// produces is written into this repository.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = path.join(rootDir, "scripts/generate-rcap-master-library-13.mjs");
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const failures = [];
const scratches = [];
process.on("exit", () => {
  for (const dir of scratches) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } }
});

/** The installer the generator ships, taken from the generator itself. */
function installerText() {
  const source = fs.readFileSync(GENERATOR, "utf8");
  const opened = source.indexOf("const INSTALLER = `");
  if (opened < 0) throw new Error("the generator no longer defines INSTALLER");
  const start = opened + "const INSTALLER = `".length;
  const end = source.indexOf("\n`;", start);
  if (end < 0) throw new Error("the INSTALLER template is not terminated");
  return source.slice(start, end)
    .replace(/\\`/g, "`")
    .replace(/\\\$/g, "$");
}

const ENTRIES = [
  "STATES/CAN/02_PACKET_FORMS/CAN__FORM__A__canary__REV-2026-01__EN.pdf",
  "STATES/CAN/02_PACKET_FORMS/CAN__FORM__B__canary__REV-2026-01__EN.pdf",
  "STATES/CAN/03_INSTRUCTIONS/CAN__INSTRUCTIONS__C__canary__REV-2026-01__EN.pdf"
];

/** A built pack: the files, the manifest they are checked against, install.sh. */
function buildSyntheticPack() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-ml13-canary-"));
  scratches.push(scratch);
  const staging = path.join(scratch, "staging");
  const files = [];
  for (const entry of ENTRIES) {
    const bytes = Buffer.from(`%PDF-1.4\n% synthetic install canary for ${entry}\n%%EOF\n`, "utf8");
    const dest = path.join(staging, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    files.push({ pathInArchive: entry, sha256: sha256(bytes), byteLength: bytes.length });
  }
  fs.writeFileSync(path.join(staging, "manifest.json"),
    `${JSON.stringify({ packId: "canary", files }, null, 2)}\n`);
  const installer = path.join(staging, "install.sh");
  fs.writeFileSync(installer, installerText());
  fs.chmodSync(installer, 0o755);
  const zip = path.join(scratch, "canary.zip");
  execFileSync("zip", ["-qrX", zip, "."], { cwd: staging });
  return { scratch, zip, files };
}

/** Unzips, installs into an empty directory, re-hashes everything placed. */
function installAndRehash(zip, files, { corrupt = null } = {}) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-ml13-install-"));
  scratches.push(scratch);
  const opened = path.join(scratch, "pack");
  const target = path.join(scratch, "clean-repo");
  fs.mkdirSync(opened, { recursive: true });
  fs.mkdirSync(target, { recursive: true });
  execFileSync("unzip", ["-qq", zip, "-d", opened]);
  if (corrupt) fs.writeFileSync(path.join(opened, corrupt), Buffer.from("%PDF-1.4\n% not the court's form\n%%EOF\n"));
  const run = spawnSync("bash", [path.join(opened, "install.sh"), target], { encoding: "utf8" });
  if (run.status !== 0) return { installed: false, output: `${run.stdout ?? ""}${run.stderr ?? ""}` };
  const rehashed = [];
  for (const file of files) {
    const placed = path.join(target, file.pathInArchive);
    if (!fs.existsSync(placed)) return { installed: true, missing: file.pathInArchive };
    const bytes = fs.readFileSync(placed);
    if (sha256(bytes) !== file.sha256 || bytes.length !== file.byteLength) {
      return { installed: true, mismatch: file.pathInArchive };
    }
    rehashed.push(file.pathInArchive);
  }
  return { installed: true, rehashed };
}

console.log("master-library-13 install canaries");
const pack = buildSyntheticPack();

const CANARIES = [
  {
    id: "a_clean_pack_installs_and_every_file_re_hashes",
    covers: "the happy path - without it the refusal below could be an installer that never installs anything",
    holds: () => {
      const result = installAndRehash(pack.zip, pack.files);
      if (!result.installed) return `install.sh refused a clean pack: ${result.output.trim()}`;
      if (result.missing) return `${result.missing} did not land in the clean repository`;
      if (result.mismatch) return `${result.mismatch} re-hashes differently after installation`;
      if (result.rehashed.length !== pack.files.length) return `${result.rehashed.length} of ${pack.files.length} re-hashed`;
      return null;
    }
  },
  {
    id: "a_pack_changed_after_it_was_built_is_refused",
    covers: "bytes swapped between the factory and the lane that installs them",
    holds: () => {
      const result = installAndRehash(pack.zip, pack.files, { corrupt: ENTRIES[1] });
      if (result.installed) return "install.sh placed a file that does not match its manifest";
      if (!/FAIL/.test(result.output)) return "install.sh refused without saying why";
      return null;
    }
  },
  {
    id: "the_installer_verifies_before_it_copies",
    covers: "a half-installed corpus, where the refusal comes after the bad file is already on disk",
    holds: () => {
      const source = installerText();
      const check = source.indexOf("raise SystemExit");
      const copy = source.indexOf("shutil.copyfile");
      if (check < 0 || copy < 0) return "the installer no longer both checks and copies";
      return check < copy ? null : "the installer copies before it verifies";
    }
  },
  {
    id: "the_generator_install_proof_runs_only_on_build",
    covers: "a manifest claiming an install proof in an environment that never installed anything",
    holds: () => {
      const source = fs.readFileSync(GENERATOR, "utf8");
      if (!/installProof:\s*null/.test(source)) return "the manifest does not default installProof to null";
      if (!/if \(build\)/.test(source)) return "the build branch is gone";
      const manifestPath = path.join(rootDir, "data/rcap-all50/source-packs/master-library-13-batch-01.manifest.json");
      if (!fs.existsSync(manifestPath)) return "the committed manifest is missing";
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.built === true && manifest.installProof === null) return "a built manifest carries no install proof";
      if (manifest.built === false && manifest.installProof !== null) return "an unbuilt manifest claims an install proof";
      return null;
    }
  }
];

for (const canary of CANARIES) {
  let problem;
  try { problem = canary.holds(); } catch (error) { problem = `threw: ${error.message}`; }
  console.log(`  ${problem ? "FAIL" : "ok  "} ${canary.id}`);
  if (problem) failures.push(`${canary.id}: ${problem} - this canary guards ${canary.covers}`);
}

if (failures.length) {
  console.error(`FAIL master-library-13 install canaries - ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`OK master-library-13 install canaries - ${CANARIES.length} canaries hold: a clean pack installs and `
  + "re-hashes, a changed pack is refused, and the installer verifies before it copies");
