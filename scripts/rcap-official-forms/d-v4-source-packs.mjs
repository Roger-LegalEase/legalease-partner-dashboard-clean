// Locates a family's official source binary inside the extracted D source packs.
//
// The packs are released separately and extracted outside every Git worktree,
// so nothing here reads a committed binary and nothing here writes one. A
// family is matched by the SHA-256 its own source-record.json declares, not by
// a filename: the same form appears under several names across the library, and
// a name match would happily hand back the wrong revision.
//
// Set RCAP_SOURCE_PACK_ROOT to point at the extraction directory. The default
// is where this wave's packs were unpacked.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SOURCE_PACK_ROOT = process.env.RCAP_SOURCE_PACK_ROOT ?? "/tmp/rcap-source-packs";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

let index = null;

/**
 * Indexes every PDF under the extraction root by its own content hash.
 *
 * Built once per process: the packs hold a few hundred files and hashing them
 * repeatedly would dominate a render.
 */
export function sourcePackIndex() {
  if (index) return index;
  index = new Map();
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && /\.pdf$/i.test(e.name)) {
        const h = sha256(fs.readFileSync(p));
        if (!index.has(h)) index.set(h, []);
        index.get(h).push(p);
      }
    }
  };
  walk(SOURCE_PACK_ROOT);
  return index;
}

export class SourceBinaryUnavailableError extends Error {
  constructor(sha, familyId) {
    super(`no extracted source binary hashes to ${sha} for ${familyId}; extract the D source packs under ${SOURCE_PACK_ROOT}`);
    this.name = "SourceBinaryUnavailableError";
    this.reason = "source_binary_not_present_in_extracted_pack";
    this.sha256 = sha;
    this.familyId = familyId;
  }
}

/**
 * Returns the bytes of the source binary whose hash matches, or throws.
 *
 * Throwing rather than returning null is deliberate: a caller that treats a
 * missing source as an empty one renders a form from nothing and reports it as
 * clean.
 */
export function readSourceBinary({ sha256: want, familyId = "(unnamed family)", byteLength = null }) {
  const matches = sourcePackIndex().get(want) ?? [];
  if (matches.length === 0) throw new SourceBinaryUnavailableError(want, familyId);
  const bytes = fs.readFileSync(matches[0]);
  if (byteLength != null && bytes.length !== byteLength) {
    throw new Error(`${familyId}: source binary is ${bytes.length} bytes, record declares ${byteLength}`);
  }
  return { bytes, extractedPath: matches[0], allMatches: matches };
}
