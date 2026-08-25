/**
 * Clears participant-bearing browser state before a shared device is handed to
 * another person. The server reset is invoked by the UI before this function;
 * local cleanup still completes if the network is unavailable.
 */
export async function resetClinicDeviceState(environment = globalThis, cleanEntryPath = "/clinic") {
  environment.localStorage?.clear?.();
  environment.sessionStorage?.clear?.();

  const databases = typeof environment.indexedDB?.databases === "function"
    ? await environment.indexedDB.databases().catch(() => [])
    : [];
  await Promise.all(databases
    .map((database) => database?.name)
    .filter(Boolean)
    .map((name) => deleteDatabase(environment.indexedDB, name)));

  if (environment.caches?.keys) {
    const cacheNames = await environment.caches.keys().catch(() => []);
    await Promise.all(cacheNames.map((name) => environment.caches.delete(name).catch(() => false)));
  }

  if (environment.navigator?.serviceWorker?.getRegistrations) {
    const registrations = await environment.navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
  }

  environment.history?.replaceState?.(null, "", cleanEntryPath);
  environment.location?.replace?.(cleanEntryPath);
  return { ok: true };
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
