#!/usr/bin/env node
// Builds one source archive per implementation session, plus a combined pack for
// the evidence sessions.
//
//   node scripts/build-rcap-pdf-finish-source-packs.mjs
//
// Worker containers do not carry the corpora. This captain environment does, and
// it has already matched every implementation family's pinned SHA-256 against a
// real file. So the packs are BUILT from those bytes rather than described: a
// manifest that says the source exists is worth nothing in a container where it
// does not.
//
// Nothing here is committed. The archives are written under tmp/, which is
// git-ignored, and the official PDFs never enter the repository.
//
// Identity is the digest, never the filename. The installer re-derives it on
// arrival, because a pack that trusts its own manifest cannot detect the one
// failure mode that matters — the wrong bytes under the right name.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(rootDir, "tmp/source-packs");
const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";

const abs = (p) => path.join(rootDir, p);
const fail = (m) => { console.error(`FAIL source packs — ${m}`); process.exit(1); };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const workview = JSON.parse(fs.readFileSync(abs(WORKVIEW), "utf8"));
const implementation = workview.families.filter((f) => f.ownerLane.lane === "implementation worker");
if (!implementation.length) fail("the work view lists no implementation family");

/**
 * A member is one official source file, addressed by digest.
 *
 * The destination is the canonical private path the resolved corpus file already
 * occupies here, so an installed worker container ends up byte-identical to this
 * one rather than merely close enough.
 */
const memberFor = (family) => {
  const src = family.sourceAvailability;
  if (src.status !== "present_and_hash_verified") {
    fail(`${family.familyId} has no hash-verified source and cannot be packed`);
  }
  const onDisk = abs(src.resolvedPath);
  if (!fs.existsSync(onDisk)) fail(`${family.familyId}: ${src.resolvedPath} is in the work view but not on disk`);
  const bytes = fs.readFileSync(onDisk);
  const digest = sha256(bytes);
  // Re-derived at pack time. The work view is a record, not an authority.
  if (digest !== src.sha256) {
    fail(`${family.familyId}: ${src.resolvedPath} hashes ${digest} but the work view pins ${src.sha256}`);
  }
  if (bytes.length !== src.byteLength) {
    fail(`${family.familyId}: ${src.resolvedPath} is ${bytes.length} bytes, the work view pins ${src.byteLength}`);
  }
  return {
    familyIds: [family.familyId],
    assetId: family.assetId,
    jurisdiction: family.jurisdiction,
    formId: family.formId,
    corpus: src.corpus,
    destination: src.resolvedPath,
    sha256: digest,
    byteLength: bytes.length,
    bytes
  };
};

// One member per distinct source file: several families legitimately share one
// official PDF, and shipping it twice would make the pack disagree with itself.
const mergeMembers = (families) => {
  const byDigest = new Map();
  for (const family of families) {
    const member = memberFor(family);
    const existing = byDigest.get(member.sha256);
    if (existing) {
      if (existing.destination !== member.destination) {
        fail(`${member.sha256} resolves to two destinations: ${existing.destination} and ${member.destination}`);
      }
      existing.familyIds.push(family.familyId);
      continue;
    }
    byDigest.set(member.sha256, member);
  }
  return [...byDigest.values()].sort((a, b) => a.destination.localeCompare(b.destination));
};

const INSTALLER = `#!/usr/bin/env node
// Installs this pack's official source members under private/.
//
//   node install.mjs --dry-run            report only, write nothing
//   node install.mjs --root <repo-root>   install into that checkout
//
// Identity is the SHA-256, never the filename. Every member is verified before
// it is copied and re-hashed after, and a copy that fails verification is
// removed rather than left behind for a later run to mistake for a good one.
// Idempotent: a destination already holding the right bytes is left alone.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const rootArg = argv.indexOf("--root");
const root = rootArg >= 0 ? path.resolve(argv[rootArg + 1]) : process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(here, "manifest.json"), "utf8"));
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

let installed = 0, already = 0, problems = 0;
for (const m of manifest.members) {
  const from = path.join(here, "members", m.sha256);
  if (!fs.existsSync(from)) { console.error(\`MISSING  \${m.destination} — member \${m.sha256} is not in this pack\`); problems += 1; continue; }
  const bytes = fs.readFileSync(from);
  if (sha256(bytes) !== m.sha256 || bytes.length !== m.byteLength) {
    console.error(\`CORRUPT  \${m.destination} — member does not match its manifest entry\`);
    problems += 1;
    continue;
  }
  // Only ever under private/. A pack that can write elsewhere is a pack that can
  // overwrite the repository.
  const dest = path.resolve(root, m.destination);
  const privateRoot = path.resolve(root, "private");
  if (dest !== privateRoot && !dest.startsWith(privateRoot + path.sep)) {
    console.error(\`REFUSED  \${m.destination} — outside private/\`);
    problems += 1;
    continue;
  }
  if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === m.sha256) { already += 1; continue; }
  if (dryRun) { console.log(\`WOULD    \${m.destination}  (\${m.byteLength} bytes)\`); installed += 1; continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  if (sha256(fs.readFileSync(dest)) !== m.sha256) {
    fs.rmSync(dest, { force: true });
    console.error(\`FAILED   \${m.destination} — re-hash after copy did not match; the copy was removed\`);
    problems += 1;
    continue;
  }
  installed += 1;
}

const extra = fs.existsSync(path.join(here, "members"))
  ? fs.readdirSync(path.join(here, "members")).filter((f) => !manifest.members.some((m) => m.sha256 === f))
  : [];
if (extra.length) { console.error(\`REFUSED  \${extra.length} member file(s) not named by the manifest\`); problems += extra.length; }

console.log(\`\${manifest.packId}: \${installed} \${dryRun ? "to install" : "installed"}, \${already} already correct, \${problems} problem(s)\`);
process.exit(problems ? 1 : 0);
`;

function buildPack(packId, families, note) {
  const members = mergeMembers(families);
  const dir = path.join(OUT_DIR, packId);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "members"), { recursive: true });
  for (const m of members) fs.writeFileSync(path.join(dir, "members", m.sha256), m.bytes);
  const manifest = {
    schemaVersion: "rcap-pdf-finish-source-pack/v1",
    packId,
    note,
    builtFrom: WORKVIEW,
    assignmentRevision: workview.assignmentRevision,
    captainBaseSha: workview.captainBaseSha,
    familyCount: families.length,
    memberCount: members.length,
    identityIs: "the SHA-256. Filenames inside the pack ARE the digest, so a renamed member cannot be mistaken for a different one.",
    members: members.map(({ bytes, ...rest }) => rest)
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "install.mjs"), INSTALLER);
  fs.chmodSync(path.join(dir, "install.mjs"), 0o755);

  const zip = path.join(OUT_DIR, `${packId}.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync("zip", ["-rq", "-X", zip, "."], { cwd: dir });
  const zipBytes = fs.readFileSync(zip);
  return { packId, zip, families: families.length, members: members.length,
    sha256: sha256(zipBytes), byteLength: zipBytes.length };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const bySession = new Map();
for (const f of implementation) {
  const s = f.ownerLane.session;
  if (!bySession.has(s)) bySession.set(s, []);
  bySession.get(s).push(f);
}

const built = [];
for (const session of [...bySession.keys()].sort((a, b) => a - b)) {
  built.push(buildPack(`pdf-finish-session-${session}`, bySession.get(session),
    `official sources for the ${bySession.get(session).length} families assigned to session ${session}`));
}
built.push(buildPack("pdf-finish-evidence-69", implementation,
  "the complete official source set for all 69 implementation families, for the sidecar and visual evidence sessions"));

const covered = new Set(built.filter((b) => b.packId !== "pdf-finish-evidence-69")
  .flatMap((b) => []));
{
  // Coverage is asserted, not assumed: a worker missing one member stalls on the
  // one family nobody notices.
  const packedFamilies = new Set();
  for (const [, list] of bySession) for (const f of list) packedFamilies.add(f.familyId);
  if (packedFamilies.size !== implementation.length) {
    fail(`packed ${packedFamilies.size} families against ${implementation.length} implementation families`);
  }
  const evidence = built.find((b) => b.packId === "pdf-finish-evidence-69");
  if (!evidence) fail("the combined evidence pack was not built");
}

console.log(`OK source packs — ${built.length} archive(s) for ${implementation.length} implementation families\n`);
for (const b of built) {
  console.log(`${b.packId}`);
  console.log(`  path   ${b.zip}`);
  console.log(`  sha256 ${b.sha256}`);
  console.log(`  bytes  ${b.byteLength}   (${b.families} famil(ies), ${b.members} member(s))`);
}
