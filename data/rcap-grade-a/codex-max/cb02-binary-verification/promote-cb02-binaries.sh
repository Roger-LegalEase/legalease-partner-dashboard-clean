#!/usr/bin/env bash
set -euo pipefail

# This script intentionally remains fail closed until a verification run can bind
# it to the real CB02 generator and all six artifacts. It changes no legal text and
# installs nothing while verification.json carries a repair-required verdict.
repo_root="$(git rev-parse --show-toplevel)"
verification="$repo_root/data/rcap-grade-a/codex-max/cb02-binary-verification/verification.json"

node - "$verification" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const proof = JSON.parse(fs.readFileSync(path, 'utf8'));

if (proof.verdict !== 'BINARY_PROMOTION_READY') {
  process.stderr.write(JSON.stringify({
    schemaVersion: 'cb02-binary-promotion-receipt/v1',
    assignment: 'CB02V-BINARY',
    installed: false,
    artifactCount: 0,
    reason: proof.verdict
  }) + '\n');
  process.exit(1);
}

// A ready proof must supply an exact committed generator invocation and six
// source/destination records. Refuse instead of guessing any repository path.
if (!Array.isArray(proof.generatorCommand) || proof.generatorCommand.length === 0 ||
    !Array.isArray(proof.artifacts) || proof.artifacts.length !== 6) {
  throw new Error('ready proof lacks generatorCommand or exactly six artifacts');
}
throw new Error('repair required: this checkout has no CB02 implementation to promote');
NODE
