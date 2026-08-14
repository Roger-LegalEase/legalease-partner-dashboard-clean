// The single execution contract for any harness that mutates tracked bytes.
//
// WHY THIS EXISTS
//
// Mutation harnesses prove a check is load-bearing by breaking the thing it
// guards and requiring the check to go red. To do that they write to tracked
// files — application source, migrations, committed data — and put them back
// afterwards. Every harness in this repository did that restoration in a
// `finally` block.
//
// A `finally` block does not run when the process is signalled. Two interrupted
// runs left tracked mutations behind: a participant payment grant stranded in
// the Phase 52 migration, which is the exact grant Phase 52 exists to revoke,
// and a mutation stranded in Phase 54. Both were caught by a scope guard that
// happened to run afterwards. Neither had to be.
//
// So restoration is no longer only a `finally`. Before the first write, a
// harness writes a JOURNAL naming every file it is about to touch, with the
// original bytes and their hash. If the process dies in any way that leaves the
// journal behind, the next repository command finds it and restores from it
// before doing anything else.
//
// SIGKILL and host termination cannot be caught — nothing in a process can
// catch SIGKILL. That is precisely why the journal is on disk and why recovery
// happens at the START of the next run rather than at the end of this one.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_DIR = path.join(rootDir, ".rcap-mutation");
const LOCK_PATH = path.join(STATE_DIR, "lock.json");
const JOURNAL_PATH = path.join(STATE_DIR, "journal.json");

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means it exists and belongs to someone else, which still counts.
    return error.code === "EPERM";
  }
}

/**
 * Restore every file a journal names, and prove it.
 *
 * Idempotent: a file already matching its recorded original hash is left alone,
 * so running recovery twice is not a second write. Restoration that cannot be
 * proven byte-exact throws rather than reporting success.
 */
export function restoreFromJournal(journal) {
  const restored = [];
  for (const entry of journal.files ?? []) {
    const absolute = entry.absolutePath;
    const original = Buffer.from(entry.originalBase64, "base64");
    const existed = entry.existedBefore !== false;

    if (!existed) {
      // The harness created this file; the original state is its absence.
      if (fs.existsSync(absolute)) {
        fs.rmSync(absolute);
        restored.push({ path: entry.repoPath, action: "removed_created_file" });
      }
      continue;
    }

    const current = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    if (current && sha256(current) === entry.originalSha256) continue;

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, original);

    const after = sha256(fs.readFileSync(absolute));
    if (after !== entry.originalSha256) {
      throw new Error(
        `tracked-mutation-guard: restoring ${entry.repoPath} produced ${after.slice(0, 12)}…, expected ${entry.originalSha256.slice(0, 12)}…; refusing to report a restoration that did not happen`
      );
    }
    restored.push({ path: entry.repoPath, action: "restored" });
  }
  return restored;
}

/**
 * Recover a journal left behind by a previous run.
 *
 * Called at the start of every repository command that inspects or asserts on
 * the working tree. Returns the list of files it put back, so the caller can
 * say so out loud rather than silently papering over a crash.
 */
export function recoverStaleMutations({ quiet = false } = {}) {
  if (!fs.existsSync(JOURNAL_PATH)) return [];

  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
  } catch {
    throw new Error(
      `tracked-mutation-guard: ${path.relative(rootDir, JOURNAL_PATH)} is unreadable. A mutation harness died mid-write and its original bytes cannot be recovered automatically; restore the affected files from git before continuing.`
    );
  }

  if (processIsAlive(journal.pid) && journal.pid !== process.pid) {
    throw new Error(
      `tracked-mutation-guard: ${journal.owner} (pid ${journal.pid}) is still running and owns the working tree. Wait for it rather than inspecting a tree it is mid-mutation on.`
    );
  }

  const restored = restoreFromJournal(journal);
  fs.rmSync(JOURNAL_PATH, { force: true });
  fs.rmSync(LOCK_PATH, { force: true });

  if (restored.length > 0 && !quiet) {
    console.error(`tracked-mutation-guard: recovered ${restored.length} file(s) stranded by ${journal.owner} (pid ${journal.pid}, ${journal.startedAt}):`);
    for (const entry of restored) console.error(`  - ${entry.action} ${entry.path}`);
  }
  return restored;
}

/** True while a live mutator owns the tree. */
export function mutationInProgress() {
  if (!fs.existsSync(LOCK_PATH)) return false;
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
    return processIsAlive(lock.pid) && lock.pid !== process.pid;
  } catch {
    return false;
  }
}

/**
 * Refuse to proceed while a mutation owns the tree, and clean up after one that
 * died. Every generated-artifact writer, scope guard and clean-tree assertion
 * calls this first: a guard that reads the tree mid-mutation reports fiction.
 */
export function assertTreeNotMidMutation(callerName) {
  if (mutationInProgress()) {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
    throw new Error(
      `${callerName}: refusing to run while ${lock.owner} (pid ${lock.pid}) holds the repository mutation lock. Its mutations are in the working tree right now and anything read here would be fiction.`
    );
  }
  return recoverStaleMutations();
}

function acquireLock(owner) {
  ensureStateDir();
  recoverStaleMutations({ quiet: true });

  if (fs.existsSync(LOCK_PATH)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
    if (processIsAlive(lock.pid) && lock.pid !== process.pid) {
      throw new Error(
        `tracked-mutation-guard: ${owner} cannot start; ${lock.owner} (pid ${lock.pid}) already owns the repository mutation lock.`
      );
    }
    fs.rmSync(LOCK_PATH, { force: true });
  }

  fs.writeFileSync(LOCK_PATH, `${JSON.stringify({ owner, pid: process.pid, acquiredAt: new Date().toISOString() }, null, 2)}\n`);
}

function writeJournal(owner, files) {
  const journal = {
    owner,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    note: "Original bytes for every tracked file this harness may mutate. If this file still exists, a run died before restoring; the next repository command restores from it.",
    files
  };
  // Written and flushed BEFORE the first mutation, so a process killed between
  // the journal and the write has nothing to recover, and one killed after has
  // everything.
  const handle = fs.openSync(JOURNAL_PATH, "w");
  try {
    fs.writeSync(handle, `${JSON.stringify(journal, null, 2)}\n`);
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  return journal;
}

/**
 * Run `body` with exclusive, signal-safe ownership of the named tracked files.
 *
 * `paths` are repo-relative. Every one is journalled before `body` runs, and
 * restored on every exit path a process can take short of SIGKILL — return,
 * throw, uncaught exception, unhandled rejection, SIGINT, SIGTERM, SIGHUP, and
 * plain `process.exit()`.
 */
export async function withTrackedMutation(owner, paths, body) {
  if (!owner || typeof owner !== "string") throw new Error("tracked-mutation-guard: an owner name is required");
  const repoPaths = [...new Set(paths)].sort();
  if (repoPaths.length === 0) throw new Error(`tracked-mutation-guard: ${owner} declared no files to mutate`);

  acquireLock(owner);

  const files = repoPaths.map((repoPath) => {
    const absolute = path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath);
    const existed = fs.existsSync(absolute);
    const original = existed ? fs.readFileSync(absolute) : Buffer.alloc(0);
    return {
      repoPath: path.relative(rootDir, absolute),
      absolutePath: absolute,
      existedBefore: existed,
      originalSha256: existed ? sha256(original) : null,
      originalBase64: original.toString("base64")
    };
  });

  const journal = writeJournal(owner, files);

  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    try {
      restoreFromJournal(journal);
    } finally {
      fs.rmSync(JOURNAL_PATH, { force: true });
      fs.rmSync(LOCK_PATH, { force: true });
    }
  };

  const onSignal = (signal) => {
    try {
      cleanup();
      console.error(`tracked-mutation-guard: ${owner} restored ${files.length} file(s) after ${signal}.`);
    } catch (error) {
      console.error(`tracked-mutation-guard: restoration after ${signal} FAILED: ${error.message}`);
      process.exitCode = 1;
    }
    // Re-raise with the default handler so the exit status is honest.
    process.removeListener(signal, onSignal);
    process.kill(process.pid, signal);
  };

  const onFatal = (error) => {
    try {
      cleanup();
    } catch (restoreError) {
      console.error(`tracked-mutation-guard: restoration after a fatal error FAILED: ${restoreError.message}`);
    }
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  };

  const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const signal of SIGNALS) process.on(signal, onSignal);
  process.on("uncaughtException", onFatal);
  process.on("unhandledRejection", onFatal);
  process.on("exit", cleanup);

  try {
    return await body({
      /** Replace a journalled file's bytes. Refuses anything not journalled. */
      mutate(repoPath, contents) {
        const absolute = path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath);
        const entry = files.find((f) => f.absolutePath === absolute);
        if (!entry) {
          throw new Error(`tracked-mutation-guard: ${owner} tried to mutate ${repoPath}, which it did not declare. Declare every file up front so the journal can restore it.`);
        }
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, contents);
      },
      /** Delete a journalled file. Restoration puts it back. */
      remove(repoPath) {
        const absolute = path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath);
        const entry = files.find((f) => f.absolutePath === absolute);
        if (!entry) throw new Error(`tracked-mutation-guard: ${owner} tried to remove undeclared ${repoPath}`);
        if (fs.existsSync(absolute)) fs.rmSync(absolute);
      },
      /** The original bytes, for a harness that needs to build a delta. */
      original(repoPath) {
        const absolute = path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath);
        const entry = files.find((f) => f.absolutePath === absolute);
        if (!entry) throw new Error(`tracked-mutation-guard: ${owner} asked for undeclared ${repoPath}`);
        return Buffer.from(entry.originalBase64, "base64");
      },
      journalPath: JOURNAL_PATH,
      lockPath: LOCK_PATH
    });
  } finally {
    cleanup();
    for (const signal of SIGNALS) process.removeListener(signal, onSignal);
    process.removeListener("uncaughtException", onFatal);
    process.removeListener("unhandledRejection", onFatal);
    process.removeListener("exit", cleanup);
  }
}

export const MUTATION_STATE_DIR = STATE_DIR;
export const MUTATION_LOCK_PATH = LOCK_PATH;
export const MUTATION_JOURNAL_PATH = JOURNAL_PATH;

/**
 * Process-scoped registration, for a harness whose mutation loop is spread
 * across a whole file rather than wrapped in one callback.
 *
 * It takes the lock, writes the journal and installs the same signal, fatal and
 * exit handlers as `withTrackedMutation`. The harness keeps its own
 * `finally`-based restore for the happy path; this adds the paths a `finally`
 * cannot reach. Returns a handle whose `release()` clears the journal once the
 * harness has restored everything itself.
 */
export function registerTrackedMutation(owner, paths) {
  const repoPaths = [...new Set(paths)].sort();
  acquireLock(owner);

  const files = repoPaths.map((repoPath) => {
    const absolute = path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath);
    const existed = fs.existsSync(absolute);
    const original = existed ? fs.readFileSync(absolute) : Buffer.alloc(0);
    return {
      repoPath: path.relative(rootDir, absolute),
      absolutePath: absolute,
      existedBefore: existed,
      originalSha256: existed ? sha256(original) : null,
      originalBase64: original.toString("base64")
    };
  });
  const journal = writeJournal(owner, files);

  let released = false;
  const cleanup = () => {
    if (released) return;
    released = true;
    try {
      restoreFromJournal(journal);
    } finally {
      fs.rmSync(JOURNAL_PATH, { force: true });
      fs.rmSync(LOCK_PATH, { force: true });
    }
  };

  const onSignal = (signal) => {
    try {
      cleanup();
      console.error(`tracked-mutation-guard: ${owner} restored ${files.length} file(s) after ${signal}.`);
    } catch (error) {
      console.error(`tracked-mutation-guard: restoration after ${signal} FAILED: ${error.message}`);
      process.exitCode = 1;
    }
    process.removeListener(signal, onSignal);
    process.kill(process.pid, signal);
  };
  const onFatal = (error) => {
    try {
      cleanup();
    } catch (restoreError) {
      console.error(`tracked-mutation-guard: restoration after a fatal error FAILED: ${restoreError.message}`);
    }
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  };

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, onSignal);
  process.on("uncaughtException", onFatal);
  process.on("unhandledRejection", onFatal);
  process.on("exit", cleanup);

  return { files: files.map((f) => f.repoPath), release: cleanup };
}
