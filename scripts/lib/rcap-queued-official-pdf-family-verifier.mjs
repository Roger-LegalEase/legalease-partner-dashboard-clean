import {
  verifyQueuedOfficialPdfFamilyScaffold
} from "./rcap-queued-official-pdf-family-scaffold.mjs";

export async function runQueuedOfficialPdfFamilyVerifierCli({
  root,
  specPath,
  argv
}) {
  const parsed = parseArgs(argv);
  const result = verifyQueuedOfficialPdfFamilyScaffold({
    root,
    specPath,
    requireSource: parsed.requireSource,
    requireRenderable: parsed.requireRenderable,
    requirePacket: parsed.requirePacket
  });
  result.failures.unshift(...parsed.failures);
  result.ok = result.failures.length === 0;

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.ok) {
    process.stdout.write(
      [
        `${result.summary.jurisdiction} official-PDF family verification passed (${result.sections.length} sections).`,
        ...result.sections.map(
          (section, index) => `- ${index + 1}. ${section}`
        ),
        `- Counts: ${result.summary.tracks} tracks, ${result.summary.components} components, ${result.summary.documents} documents, ${result.summary.exactIdentities} exact identities, ${result.summary.unresolvedIdentities} unresolved identities.`,
        "- Runtime: 0 active renderers, 0 active mappings, 0 source-backed samples; workerReady=false; enabled=false."
      ].join("\n") + "\n"
    );
  } else {
    process.stderr.write(
      [
        `${result.summary.jurisdiction} official-PDF family verification failed (${result.failures.length} issue${result.failures.length === 1 ? "" : "s"}).`,
        ...result.failures.map((failure) => `- ${failure}`)
      ].join("\n") + "\n"
    );
  }

  if (!result.ok) process.exitCode = 1;
  return result;
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    requireSource: null,
    requireRenderable: null,
    requirePacket: null,
    failures: []
  };
  const valueArguments = new Map([
    ["--require-source", "requireSource"],
    ["--require-renderable", "requireRenderable"],
    ["--require-packet", "requirePacket"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      parsed.json = true;
      continue;
    }
    const target = valueArguments.get(argument);
    if (target === undefined) {
      parsed.failures.push(`Unknown argument: ${argument}.`);
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      parsed.failures.push(`${argument} requires a value.`);
      continue;
    }
    parsed[target] = value;
    index += 1;
  }

  return parsed;
}
