/**
 * Clears participant-bearing browser state before a shared device is handed to
 * another person. The server reset is invoked by the UI before this function;
 * local cleanup still completes if the network is unavailable.
 *
 * Every step is isolated. A browser that refuses one storage API -- private
 * windows, blocked site data, a revoked Cache Storage permission -- must not
 * stop the remaining steps from running: a reset that gives up halfway is the
 * case where one participant's identifiers, answers, uploads, packet references
 * and signed URLs survive into the next participant's session.
 *
 * The returned report says what was cleared and what refused, so the caller can
 * decide whether the device is safe to hand over. `ok` is true only when every
 * attempted step succeeded.
 */

const CLINIC_COOKIE_PREFIXES = ["clinic_", "sb-", "screening_", "briefcase_"];

export async function resetClinicDeviceState(environment = globalThis, cleanEntryPath = "/clinic", options = {}) {
  const { historyDepth = 3 } = options;
  const cleared = [];
  const failures = [];

  const step = async (name, run) => {
    try {
      const outcome = await run();
      if (outcome !== false) cleared.push(name);
      return outcome;
    } catch (error) {
      failures.push({ step: name, reason: describe(error) });
      return false;
    }
  };

  await step("localStorage", () => clearWebStorage(environment, "localStorage"));
  await step("sessionStorage", () => clearWebStorage(environment, "sessionStorage"));
  await step("cookies", () => clearReadableCookies(environment, cleanEntryPath));
  await step("indexedDB", () => clearIndexedDatabases(environment));
  await step("cacheStorage", () => clearCacheStorage(environment));
  await step("serviceWorkers", () => unregisterServiceWorkers(environment));
  await step("history", () => neutralizeHistory(environment, cleanEntryPath, historyDepth));

  // Navigate last: it can tear down this execution context, and every clearing
  // step above must have run before the device reaches the next participant.
  await step("navigation", () => {
    if (typeof environment.location?.replace !== "function") return false;
    environment.location.replace(cleanEntryPath);
    return true;
  });

  return { ok: failures.length === 0, cleared, failures };
}

function clearWebStorage(environment, area) {
  const storage = environment[area];
  if (!storage) return false;
  try {
    storage.clear?.();
  } catch {
    // `clear()` can be refused while individual removals still succeed.
    const keys = [];
    for (let index = 0; index < (storage.length ?? 0); index += 1) {
      const key = storage.key?.(index);
      if (typeof key === "string") keys.push(key);
    }
    for (const key of keys) storage.removeItem?.(key);
  }
  const remaining = storage.length ?? 0;
  if (remaining > 0) throw new Error(`${remaining} ${area} entries survived the reset`);
  return true;
}

/**
 * Expires every cookie this document can read whose name belongs to a Clinic,
 * screening or Briefcase handle. HttpOnly cookies are cleared by the server
 * reset; these are the ones that would otherwise outlive an offline reset.
 */
function clearReadableCookies(environment, cleanEntryPath) {
  const document = environment.document;
  if (typeof document?.cookie !== "string") return false;
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name) => name && CLINIC_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)));
  if (names.length === 0) return true;
  const paths = ["/", cleanEntryPath.startsWith("/") ? cleanEntryPath : `/${cleanEntryPath}`];
  for (const name of names) {
    for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
    }
  }
  return true;
}

async function clearIndexedDatabases(environment) {
  const indexedDB = environment.indexedDB;
  if (!indexedDB) return false;
  if (typeof indexedDB.databases !== "function") {
    // Without enumeration there is no way to prove the participant's databases
    // are gone. Say so rather than reporting a clean device.
    throw new Error("this browser cannot enumerate IndexedDB databases");
  }
  const databases = await indexedDB.databases().catch(() => {
    throw new Error("IndexedDB enumeration was refused");
  });
  const names = (databases ?? []).map((database) => database?.name).filter(Boolean);
  const outcomes = await Promise.all(names.map((name) => deleteDatabase(indexedDB, name)));
  const stuck = names.filter((_, index) => !outcomes[index]);
  if (stuck.length > 0) throw new Error(`IndexedDB databases were not deleted: ${stuck.join(", ")}`);
  return true;
}

async function clearCacheStorage(environment) {
  if (!environment.caches?.keys) return false;
  const cacheNames = await environment.caches.keys();
  const outcomes = await Promise.all(cacheNames.map((name) => environment.caches.delete(name)));
  const stuck = cacheNames.filter((_, index) => outcomes[index] === false);
  if (stuck.length > 0) throw new Error(`cached responses were not deleted: ${stuck.join(", ")}`);
  return true;
}

async function unregisterServiceWorkers(environment) {
  const container = environment.navigator?.serviceWorker;
  if (!container?.getRegistrations) return false;
  const registrations = await container.getRegistrations();
  const outcomes = await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
  if (outcomes.some((outcome) => outcome === false)) throw new Error("a service worker refused to unregister");
  return true;
}

/**
 * Points the session history at the clean entry and stacks neutral entries
 * behind it, so Back and Forward land on the clean Clinic entry instead of a
 * participant-bearing URL.
 *
 * The History API cannot delete entries, so this cannot erase a deep journey on
 * its own; it is one layer. The Clinic privacy boundary carries the other, a
 * `pageshow` handler that re-runs this reset when a page is restored from the
 * back/forward cache. A `popstate` guard is installed here so a Back press that
 * does reach this document is sent straight back to the clean entry.
 */
function neutralizeHistory(environment, cleanEntryPath, historyDepth) {
  const history = environment.history;
  if (typeof history?.replaceState !== "function") return false;
  history.replaceState(null, "", cleanEntryPath);
  if (typeof history.pushState === "function") {
    for (let entry = 0; entry < Math.max(0, historyDepth); entry += 1) {
      history.pushState(null, "", cleanEntryPath);
    }
    history.replaceState(null, "", cleanEntryPath);
  }
  if (typeof environment.addEventListener === "function") {
    environment.addEventListener("popstate", () => {
      try {
        history.replaceState(null, "", cleanEntryPath);
        history.pushState?.(null, "", cleanEntryPath);
      } catch {
        environment.location?.replace?.(cleanEntryPath);
      }
    });
  }
  return true;
}

function deleteDatabase(indexedDB, name) {
  return new Promise((resolve) => {
    if (!indexedDB?.deleteDatabase) return resolve(false);
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  });
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
