#!/usr/bin/env node
// The New Jersey implementation used to carry its own copy of where CN-10557
// sits and resolve a path from it. A module that does that resolves a location
// the source contract never agreed to, and keeps resolving it after the captain
// moves the source — which is exactly what the official-PDF source-contract
// reconciliation forbids.
//
// These cases hold the replacement contract: the destination comes from the
// committed receipt, the receipt has to bind this exact identity before a byte
// is read, and every way of getting that wrong fails closed rather than falling
// back to a guess.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  NEW_JERSEY_ACROFORM_RECEIPT_PATH,
  NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT,
  resolveNewJerseyAcroformDestination
} = await import("@/lib/rcap/packets/jurisdictions/new-jersey/acroform");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY_DESTINATION =
  "official-pdf/NJ/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf";
const IDENTITY = "rcap-nj-cn-10557-814e1397cd";

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

const receipt = JSON.parse(
  fs.readFileSync(path.join(ROOT, NEW_JERSEY_ACROFORM_RECEIPT_PATH), "utf8")
);

/** Run the resolver against a repository whose only content is one receipt. */
function withReceipt(mutate) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nj-contract-"));
  try {
    const target = path.join(scratch, ...NEW_JERSEY_ACROFORM_RECEIPT_PATH.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const candidate = structuredClone(receipt);
    if (mutate) mutate(candidate);
    if (candidate !== null) {
      fs.writeFileSync(target, `${JSON.stringify(candidate, null, 2)}\n`);
    }
    return resolveNewJerseyAcroformDestination({ repositoryRoot: scratch });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function refuses(mutate, expectedCode) {
  let thrown = null;
  try {
    withReceipt(mutate);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, "expected the resolver to refuse");
  assert.equal(thrown.code, expectedCode, thrown.message);
}

check("CN-10557 resolves through its committed receipt", () => {
  const destination = resolveNewJerseyAcroformDestination({ repositoryRoot: ROOT });
  assert.equal(destination, receipt.materializationDestination);
  assert.equal(receipt.provenance.sourceIdentityKey, IDENTITY);
  assert.equal(
    receipt.expectedSha256,
    NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT.expectedSha256
  );
  assert.equal(
    receipt.expectedBytes,
    NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT.expectedBytes
  );
});

check("the implementation carries no destination of its own", () => {
  // The pinned requirement states what the source is, never where it is.
  assert.equal(
    Object.hasOwn(NEW_JERSEY_ACROFORM_SOURCE_REQUIREMENT, "materializationDestination"),
    false
  );
  const module = fs.readFileSync(
    path.join(ROOT, "src/lib/rcap/packets/jurisdictions/new-jersey/acroform.ts"),
    "utf8"
  );
  assert.doesNotMatch(
    module,
    /path\.(?:join|resolve)\([^)]*requirement\.materializationDestination[^)]*\)/su,
    "the module must not resolve a pre-contract destination"
  );
});

check("the legacy destination is not authority, only what the receipt says", () => {
  // It happens to be where the source sits today. The point is that the value
  // is read from the contract: move it in the receipt and the resolver follows.
  const moved = withReceipt((candidate) => {
    candidate.materializationDestination = "official-pdf/NJ/moved-by-the-captain.pdf";
  });
  assert.equal(moved, "official-pdf/NJ/moved-by-the-captain.pdf");
  assert.notEqual(moved, LEGACY_DESTINATION);
});

check("a missing or unreadable receipt fails closed", () => {
  const absent = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nj-absent-"));
  const unreadable = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nj-bad-"));
  try {
    for (const [root, label] of [
      [absent, "no receipt at all"],
      [unreadable, "a receipt that is not valid JSON"]
    ]) {
      if (label.startsWith("a receipt")) {
        const target = path.join(
          root,
          ...NEW_JERSEY_ACROFORM_RECEIPT_PATH.split("/")
        );
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "{ not json");
      }
      let thrown = null;
      try {
        resolveNewJerseyAcroformDestination({ repositoryRoot: root });
      } catch (error) {
        thrown = error;
      }
      assert.ok(thrown, label);
      assert.equal(thrown.code, "source_contract_missing", label);
    }
  } finally {
    fs.rmSync(absent, { recursive: true, force: true });
    fs.rmSync(unreadable, { recursive: true, force: true });
  }
});

check("a mismatched source hash fails closed", () => {
  refuses((candidate) => {
    candidate.actualSha256 = "0".repeat(64);
  }, "source_contract_mismatch");
  refuses((candidate) => {
    candidate.expectedSha256 = "0".repeat(64);
  }, "source_contract_mismatch");
});

check("a mismatched byte count or media type fails closed", () => {
  refuses((candidate) => {
    candidate.actualBytes = 1;
  }, "source_contract_mismatch");
  refuses((candidate) => {
    candidate.expectedMediaType = "application/octet-stream";
  }, "source_contract_mismatch");
});

check("another identity's receipt cannot be consumed", () => {
  refuses((candidate) => {
    candidate.provenance.sourceIdentityKey = "rcap-vt-200-00130-b0ad96be1d";
  }, "source_contract_mismatch");
  refuses((candidate) => {
    candidate.documentId = "200-00130";
  }, "source_contract_mismatch");
});

check("an unready receipt cannot locate a source", () => {
  refuses((candidate) => {
    candidate.ready = false;
  }, "source_contract_mismatch");
  refuses((candidate) => {
    candidate.workerReady = false;
  }, "source_contract_mismatch");
  refuses((candidate) => {
    delete candidate.materializationDestination;
  }, "source_contract_mismatch");
});

console.log(
  `New Jersey portable source contract verified: ${checks} checks.`
);
console.log(`  identity    ${IDENTITY}`);
console.log(`  destination read from ${NEW_JERSEY_ACROFORM_RECEIPT_PATH}`);
console.log(
  `  refuses     a missing receipt, a wrong hash, a wrong size, a wrong media type, another identity and an unready contract`
);
