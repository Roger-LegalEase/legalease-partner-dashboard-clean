/**
 * Where an entry in data/rcap-all50/local-source-corpus-index.json actually is.
 *
 * The index used to describe one custody -- the Master Library -- so every
 * reader could join its root onto `entry.path` and be right. It now describes
 * several, and each writes its paths in its own namespace:
 *
 *   pathsRelativeTo "custodyRoot"     STATES/AK/…                (Master Library)
 *   pathsRelativeTo "repositoryRoot"  private/human-source-returns/TX/…
 *
 * A reader that joins the Master Library root onto all of them looks for a
 * human source return inside the library, does not find it, and reports drift
 * about a file that is exactly where it belongs. That is a false corruption
 * report, which is worse than no report: it trains a reader to ignore the check.
 *
 * So resolution follows what the index declares in its `custodies` array rather
 * than the shape of the path, and an index that declares nothing (the v1 shape)
 * resolves exactly as it did before.
 *
 * Whether a custody is mounted is a separate question from whether its bytes
 * match, and callers must keep it separate. The Master Library is the only
 * corpus the pinned release carries, so a container can legitimately hold it
 * and nothing else; the entries of an unmounted custody are unchecked, not
 * wrong.
 */
import fs from "node:fs";
import path from "node:path";

export const MASTER_LIBRARY_CUSTODY = "master_library";
export const MASTER_LIBRARY_RELATIVE = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";

/**
 * @param {object} index         the parsed corpus index
 * @param {object} options
 * @param {string} options.repoRoot            absolute path to the repository root
 * @param {string} [options.masterLibraryRoot] absolute path to the Master Library, when
 *                                             this environment points at it somewhere else
 */
export function makeCorpusEntryResolver(index, { repoRoot, masterLibraryRoot } = {}) {
  const declared = new Map((index?.custodies ?? []).map((c) => [c.id, c]));
  const libraryRoot = masterLibraryRoot ?? path.join(repoRoot, MASTER_LIBRARY_RELATIVE);

  const custodyOf = (entry) => entry?.custody ?? MASTER_LIBRARY_CUSTODY;

  /** The directory a custody's bytes live under, or null when it is not declared. */
  const rootFor = (custodyId) => {
    if (custodyId === MASTER_LIBRARY_CUSTODY) return libraryRoot;
    const custody = declared.get(custodyId);
    if (!custody) return null;
    return path.join(repoRoot, custody.root);
  };

  /** The absolute path of one entry's bytes, or null when its custody is undeclared. */
  const resolve = (entry) => {
    const id = custodyOf(entry);
    const root = rootFor(id);
    if (root === null) return null;
    const custody = declared.get(id);
    // No declaration means the v1 index: one custody, paths under the library.
    if (!custody || custody.pathsRelativeTo === "custodyRoot") return path.join(root, entry.path);
    return path.join(repoRoot, entry.path);
  };

  const mounted = new Map();
  /** Whether this entry's custody has a tree here at all. */
  const isMounted = (entry) => {
    const id = custodyOf(entry);
    if (!mounted.has(id)) {
      const root = rootFor(id);
      mounted.set(id, root !== null && fs.existsSync(root));
    }
    return mounted.get(id);
  };

  /** The custody ids named by these entries that this container does not hold. */
  const unmountedCustodies = (entries) =>
    [...new Set((entries ?? []).filter((e) => !isMounted(e)).map(custodyOf))];

  return { custodyOf, rootFor, resolve, isMounted, unmountedCustodies };
}
