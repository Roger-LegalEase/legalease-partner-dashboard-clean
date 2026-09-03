/**
 * Shared-device Reset acceptance for Clinic Mode.
 *
 * A Clinic laptop is handed from one participant to the next. Reset Device is
 * the control that stands between them, so this suite exercises it against
 * browsers that misbehave the way real ones do -- storage that refuses to
 * clear, Cache Storage that reports a failed delete, a service worker that
 * declines to unregister, IndexedDB that cannot be enumerated -- and requires
 * that a partial reset is reported as a partial reset rather than as a clean
 * device.
 *
 * It then plays a full two-participant handover and requires that nothing the
 * first participant produced -- name, answers, matter, Briefcase, uploads,
 * packet, payment, sponsorship or event session state -- is reachable by the
 * second participant, including through Back and Forward.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const modulePath = path.join(root, "src/lib/clinic-mode/device-reset.mjs");
const moduleSource = fs.readFileSync(modulePath, "utf8");

const { resetClinicDeviceState } = await import(pathToFileURL(modulePath).href);
const CLEAN_ENTRY = "/clinic/synthetic-event";

// Everything the first participant can leave behind on the device.
const PARTICIPANT_TRACES = [
  ["participantName", "Dana Alvarez"],
  ["participantUserId", "participant-a-uuid"],
  ["dateOfBirth", "1989-04-02"],
  ["matterId", "matter-a-uuid"],
  ["screeningAnswers", '{"convictions":[{"caseNumber":"2019-CR-004417"}]}'],
  ["uploadRefs", '["private/clinic/participant-a/disposition.pdf"]'],
  ["packetId", "packet-a-uuid"],
  ["signedUrl", "https://storage.test/object/sign/private/participant-a.pdf?token=abc"],
  ["paymentIntent", "pi_synthetic_participant_a"],
  ["sponsorshipCredit", "tenant-a-credit-1"],
  ["clinicSession", "handoff-token-participant-a"]
];

await verifyCleanBrowser();
await verifyHostileBrowsers();
await verifyHandoverBetweenParticipants();
await verifyBackAndForwardDenied();
await verifySourceContract();

console.log(`Clinic shared-device reset passed: ${PARTICIPANT_TRACES.length} participant traces cleared, 6 refusing-browser cases reported honestly, Back and Forward denied, and a clean second-participant session established.`);
console.log("Production/external services used: none.");

async function verifyCleanBrowser(reset = resetClinicDeviceState) {
  const browser = fakeBrowser();
  const report = await reset(browser, CLEAN_ENTRY);
  assert.equal(report.ok, true, `a cooperative browser reported failures: ${JSON.stringify(report.failures)}`);
  for (const step of ["localStorage", "sessionStorage", "cookies", "indexedDB", "cacheStorage", "serviceWorkers", "history", "navigation"]) {
    assert.ok(report.cleared.includes(step), `reset did not report clearing ${step}`);
  }
  assert.equal(browser.localStorage.length, 0, "localStorage survived the reset");
  assert.equal(browser.sessionStorage.length, 0, "sessionStorage survived the reset");
  for (const name of ["clinic_session", "clinic_entry", "sb-access-token"]) {
    assert.ok(!browser.document.cookie.includes(name), `participant cookie ${name} survived the reset`);
  }
  assert.ok(browser.document.cookie.includes("theme=dark"),
    "the reset cleared an unrelated device preference it had no business touching");
  assert.deepEqual(browser.deletedDatabases.sort(), ["briefcase", "clinic-answers", "uploads"], "IndexedDB survived the reset");
  assert.deepEqual(browser.deletedCaches.sort(), ["packet-previews", "screening-shell"], "Cache Storage survived the reset");
  assert.equal(browser.unregistered, 1, "the service worker survived the reset");
  assert.equal(browser.locationReplaced, CLEAN_ENTRY, "the device did not return to the clean Clinic entry");
}

/**
 * Each case refuses exactly one capability. The reset must still clear
 * everything else, and must report `ok: false` so staff are not told a device
 * is safe when one class of participant state could not be proven gone.
 */
async function verifyHostileBrowsers(reset = resetClinicDeviceState) {
  const cases = [
    ["localStorage.clear() throws but removeItem works", (browser) => {
      browser.localStorage.clear = () => { throw new DOMException("denied", "SecurityError"); };
    }, { expectOk: true, mustStillClear: ["sessionStorage", "indexedDB", "cacheStorage", "serviceWorkers", "navigation"] }],
    ["sessionStorage is entirely unavailable", (browser) => {
      browser.sessionStorage = undefined;
    }, { expectOk: true, mustStillClear: ["localStorage", "indexedDB", "cacheStorage", "serviceWorkers", "navigation"] }],
    ["storage refuses every removal", (browser) => {
      browser.localStorage.clear = () => { throw new DOMException("denied", "SecurityError"); };
      browser.localStorage.removeItem = () => {};
    }, { expectOk: false, failingStep: "localStorage", mustStillClear: ["sessionStorage", "indexedDB", "cacheStorage", "serviceWorkers", "navigation"] }],
    ["IndexedDB cannot be enumerated", (browser) => {
      delete browser.indexedDB.databases;
    }, { expectOk: false, failingStep: "indexedDB", mustStillClear: ["localStorage", "sessionStorage", "cacheStorage", "serviceWorkers", "navigation"] }],
    ["a cached response refuses deletion", (browser) => {
      browser.caches.delete = async () => false;
    }, { expectOk: false, failingStep: "cacheStorage", mustStillClear: ["localStorage", "sessionStorage", "indexedDB", "serviceWorkers", "navigation"] }],
    ["a service worker refuses to unregister", (browser) => {
      browser.navigator.serviceWorker.getRegistrations = async () => [{ unregister: async () => false }];
    }, { expectOk: false, failingStep: "serviceWorkers", mustStillClear: ["localStorage", "sessionStorage", "indexedDB", "cacheStorage", "navigation"] }]
  ];

  for (const [label, sabotage, expectation] of cases) {
    const browser = fakeBrowser();
    sabotage(browser);
    const report = await reset(browser, CLEAN_ENTRY);
    assert.equal(report.ok, expectation.expectOk, `${label}: reset reported ok=${report.ok}`);
    if (expectation.failingStep) {
      assert.ok(
        report.failures.some((failure) => failure.step === expectation.failingStep),
        `${label}: "${expectation.failingStep}" was not reported as a failure (${JSON.stringify(report.failures)})`
      );
    }
    for (const step of expectation.mustStillClear) {
      assert.ok(report.cleared.includes(step),
        `${label}: a refusing capability stopped the reset from clearing ${step}`);
    }
    assert.equal(browser.locationReplaced, CLEAN_ENTRY, `${label}: the device did not return to the clean Clinic entry`);
  }
}

async function verifyHandoverBetweenParticipants(reset = resetClinicDeviceState) {
  const browser = fakeBrowser();
  // Participant one works through a full journey on the shared device.
  assert.ok(browser.localStorage.length > 0 && browser.sessionStorage.length > 0);
  browser.history.pushState(null, "", "/clinic/synthetic-event/screening/CO");
  browser.history.pushState(null, "", "/clinic/synthetic-event/result");
  browser.history.pushState(null, "", "/briefcase/matter-a-uuid");

  const report = await reset(browser, CLEAN_ENTRY);
  assert.equal(report.ok, true, `handover reset reported failures: ${JSON.stringify(report.failures)}`);

  // Participant two sits down at the same device.
  const visible = JSON.stringify({
    local: browser.localStorage.dump(),
    session: browser.sessionStorage.dump(),
    cookies: browser.document.cookie,
    entry: browser.locationReplaced,
    history: browser.historyEntries
  });
  for (const [, trace] of PARTICIPANT_TRACES) {
    assert.ok(!visible.includes(trace),
      `the second participant could still reach the first participant's data: ${trace}`);
  }
  for (const fragment of ["matter-a-uuid", "2019-CR-004417", "Dana Alvarez", "participant-a", "pi_synthetic", "tenant-a-credit"]) {
    assert.ok(!visible.includes(fragment),
      `the second participant could still reach "${fragment}"`);
  }
  assert.equal(browser.locationReplaced, CLEAN_ENTRY, "the second participant did not start at the clean Clinic entry");
}

async function verifyBackAndForwardDenied(reset = resetClinicDeviceState) {
  const browser = fakeBrowser();
  browser.history.pushState(null, "", "/clinic/synthetic-event/screening/CO");
  browser.history.pushState(null, "", "/clinic/synthetic-event/result?matter=matter-a-uuid");
  const beforeDepth = browser.historyEntries.length;

  await reset(browser, CLEAN_ENTRY, { historyDepth: 3 });

  // The current entry, and the entries a Back press reaches first, are clean.
  assert.equal(browser.historyEntries.at(-1), CLEAN_ENTRY, "the current history entry still names a participant route");
  assert.ok(browser.historyEntries.length > beforeDepth,
    "no neutral history entries were stacked in front of the participant journey");
  for (const entry of browser.historyEntries.slice(beforeDepth - 1)) {
    assert.equal(entry, CLEAN_ENTRY, `a reachable history entry still names a participant route: ${entry}`);
  }

  // A Back press that does reach this document is sent to the clean entry.
  assert.ok(browser.listeners.popstate?.length, "no popstate guard was installed");
  browser.historyEntries.push("/clinic/synthetic-event/result?matter=matter-a-uuid");
  for (const listener of browser.listeners.popstate) listener({ type: "popstate" });
  assert.equal(browser.historyEntries.at(-1), CLEAN_ENTRY,
    "a Back press was allowed to rest on a participant route");
}

/**
 * Each guarantee this module claims is paired with a mutation proving the suite
 * fails without it.
 */
async function verifySourceContract() {
  const mutations = [
    ["per-step isolation", "const step = async (name, run) => {", "const step = async (name, run) => { if (name === 'localStorage') { await run(); cleared.push(name); return true; }"],
    ["cookie clearing", 'await step("cookies", () => clearReadableCookies(environment, cleanEntryPath));', ""],
    ["storage removal fallback", "for (const key of keys) storage.removeItem?.(key);", ""],
    ["surviving-entry check", "if (remaining > 0) throw new Error(`${remaining} ${area} entries survived the reset`);", ""],
    ["IndexedDB enumeration honesty", 'throw new Error("this browser cannot enumerate IndexedDB databases");', "return false;"],
    ["Cache Storage deletion", "const removeCache = (name) => environment.caches.delete(name);", "const removeCache = async () => true;"],
    ["service worker unregister check", 'if (outcomes.some((outcome) => outcome === false)) throw new Error("a service worker refused to unregister");', ""],
    ["history neutralization", "history.pushState(null, \"\", cleanEntryPath);\n    }", "}"],
    ["popstate guard", 'environment.addEventListener("popstate", () => {', "const unusedGuard = (() => {"]
  ];

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-reset-mutations-"));
  try {
    for (const [label, marker, replacement] of mutations) {
      assert.ok(moduleSource.includes(marker), `mutation fixture missing for ${label}`);
      const mutatedPath = path.join(scratch, `${label.replace(/\W+/gu, "-")}.mjs`);
      fs.writeFileSync(mutatedPath, moduleSource.replace(marker, replacement), "utf8");
      const mutated = await import(pathToFileURL(mutatedPath).href);
      let failed = false;
      try {
        await runAcceptanceAgainst(mutated.resetClinicDeviceState);
      } catch {
        failed = true;
      }
      assert.ok(failed, `weakening ${label} did not make this reset suite fail`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

async function runAcceptanceAgainst(reset) {
  await verifyCleanBrowser(reset);
  await verifyHostileBrowsers(reset);
  await verifyHandoverBetweenParticipants(reset);
  await verifyBackAndForwardDenied(reset);
}

function fakeBrowser() {
  const historyEntries = ["/clinic/synthetic-event/entry"];
  const listeners = {};
  const cookieJar = new Map([
    ["clinic_session", "handoff-token-participant-a"],
    ["clinic_entry", "entry-nonce-participant-a"],
    ["sb-access-token", "participant-a-uuid"],
    ["theme", "dark"]
  ]);

  const browser = {
    localStorage: webStorage([
      ["participantName", "Dana Alvarez"],
      ["participantUserId", "participant-a-uuid"],
      ["dateOfBirth", "1989-04-02"],
      ["matterId", "matter-a-uuid"],
      ["packetId", "packet-a-uuid"],
      ["paymentIntent", "pi_synthetic_participant_a"],
      ["sponsorshipCredit", "tenant-a-credit-1"]
    ]),
    sessionStorage: webStorage([
      ["screeningAnswers", '{"convictions":[{"caseNumber":"2019-CR-004417"}]}'],
      ["uploadRefs", '["private/clinic/participant-a/disposition.pdf"]'],
      ["signedUrl", "https://storage.test/object/sign/private/participant-a.pdf?token=abc"],
      ["clinicSession", "handoff-token-participant-a"]
    ]),
    deletedDatabases: [],
    deletedCaches: [],
    unregistered: 0,
    locationReplaced: "",
    historyEntries,
    listeners,
    get document() {
      return {
        get cookie() {
          return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
        },
        set cookie(value) {
          const [pair] = value.split(";");
          const [name, assigned] = pair.split("=");
          if (/max-age=0/iu.test(value) || assigned === "") cookieJar.delete(name.trim());
          else cookieJar.set(name.trim(), assigned);
        }
      };
    },
    indexedDB: {
      databases: async () => [{ name: "clinic-answers" }, { name: "briefcase" }, { name: "uploads" }],
      deleteDatabase(name) {
        const request = {};
        queueMicrotask(() => { browser.deletedDatabases.push(name); request.onsuccess?.(); });
        return request;
      }
    },
    caches: {
      keys: async () => ["screening-shell", "packet-previews"]
        .filter((name) => !browser.deletedCaches.includes(name)),
      delete: async (name) => { browser.deletedCaches.push(name); return true; }
    },
    navigator: {
      serviceWorker: {
        getRegistrations: async () => [{ unregister: async () => { browser.unregistered += 1; return true; } }]
      }
    },
    history: {
      replaceState(_state, _title, url) { historyEntries[historyEntries.length - 1] = url; },
      pushState(_state, _title, url) { historyEntries.push(url); }
    },
    location: { replace(url) { browser.locationReplaced = url; } },
    addEventListener(name, handler) { (listeners[name] ??= []).push(handler); }
  };
  return browser;
}

function webStorage(entries) {
  const map = new Map(entries);
  return {
    get length() { return map.size; },
    key(index) { return [...map.keys()][index]; },
    getItem(key) { return map.get(key) ?? null; },
    removeItem(key) { map.delete(key); },
    clear() { map.clear(); },
    dump() { return Object.fromEntries(map); }
  };
}
