// Writes every generated Colorado specification record.
//
//   node src/lib/rcap/state-packs/colorado/official-forms/run-emit.mjs
//
// Run from the repository root. Nothing here decides anything: the pipeline
// computes the files and this writes them, so the verifier can recompute the
// same files and compare. A run that changes nothing writes nothing.
import { register } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

register("../../../../../../scripts/lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = process.cwd();
const pipeline = await import("./pipeline.ts");
const artifactReview = await import("./artifact-review.ts");
const { SPECIFIED_FAMILIES, DANGLING_RENDERER_FAMILIES } = await import("./families.ts");

function gitObjectExists(sha) {
  try {
    execFileSync("git", ["cat-file", "-t", sha], { cwd: rootDir, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const requestedFamily = process.argv.find(arg => arg.startsWith("--family="))?.slice("--family=".length);
if (requestedFamily && !SPECIFIED_FAMILIES.some(family => family.family === requestedFamily)) throw new Error(`Unknown Colorado family: ${requestedFamily}`);
const files = [];
let written = 0;
let binaryWritten = 0;
const writeText = file => {
  const absolute = path.join(rootDir, file.path);
  if (fs.existsSync(absolute) && fs.readFileSync(absolute, "utf8") === file.text) return;
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, file.text); written += 1;
  process.stdout.write(`  wrote ${file.path}\n`);
};
const determination = pipeline.determineRenderer(rootDir, gitObjectExists);

for (const family of SPECIFIED_FAMILIES.filter(family => !requestedFamily || family.family === requestedFamily)) {
  const currentContext = await pipeline.loadFamilyContext(rootDir, family);
  if (typeof currentContext.sourceRecord.sourcePath === "string") {
    const current = await pipeline.computeCurrentRenderFiles(currentContext);
    for (const artifact of current.artifacts) {
      const absolute = path.join(rootDir, artifact.path);
      if (!fs.existsSync(absolute) || !fs.readFileSync(absolute).equals(artifact.bytes)) {
        fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, artifact.bytes); binaryWritten += 1;
      }
    }
    for (const file of current.files) writeText(file);
    files.push(...current.files);
  }
  const { files: familyFiles, context } = await pipeline.computeSpecifiedFamilyFiles(family, {
    rootDir,
    gitObjectExists,
  });
  files.push(...familyFiles);
  files.push(
    ...(await pipeline.computeArtifactReviewFiles({ context, readArtifact: artifactReview.readArtifact })),
  );
}

for (const family of DANGLING_RENDERER_FAMILIES.filter(family => !requestedFamily || family === requestedFamily)) {
  const source = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-all50/overlays/production/colorado", family, "source-record.json"), "utf8"));
  if (typeof source.sourcePath === "string") continue;
  files.push(pipeline.rewriteRenderReceipt(rootDir, family, determination));
  if (!SPECIFIED_FAMILIES.some((specified) => specified.family === family)) {
    files.push(pipeline.inheritedRendererProvenance(rootDir, family, determination));
  }
}

for (const file of files) writeText(file);

process.stdout.write(
  `\nColorado specification emit: ${files.length} record(s) computed, ${written} written, ${files.length - written} already current; ${binaryWritten} PDF(s) written.\n`,
);
void pathToFileURL;
