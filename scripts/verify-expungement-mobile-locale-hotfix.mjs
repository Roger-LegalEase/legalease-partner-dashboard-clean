import fs from "node:fs";
import path from "node:path";
import { fetchJsonWithTimeout } from "../src/lib/expungement-ai/frontend/profile-timeout.ts";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const start = Date.now();
const result = await fetchJsonWithTimeout("/api/expungement-ai/profiles/MS", {
  timeoutMs: 40,
  fetcher: () => new Promise(() => undefined)
});
const elapsed = Date.now() - start;

assert(result.ok === false, "Never-resolving profile fetch must resolve to ok:false.");
assert(elapsed < 1_000, `Never-resolving profile fetch took too long to settle (${elapsed}ms).`);

const timeoutHelper = read("src/lib/expungement-ai/frontend/profile-timeout.ts");
const profileLoader = read("src/lib/expungement-ai/frontend/profile-loader.ts");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const localizationProvider = read("src/components/expungement-ai/LocalizationProvider.tsx");
const landingInteractions = read("src/app/expungement-ai/ExpungementLandingInteractions.tsx");
const profileRoute = read("src/app/api/expungement-ai/profiles/[state]/route.ts");

assertIncludes(profileLoader, 'fetchJsonWithTimeout(`/api/expungement-ai/profiles/${encodeURIComponent(key)}`', "profile-loader live endpoint");
assertIncludes(timeoutHelper, "supportsNativeAbortSignalTimeout", "timeout helper feature detection");
assertIncludes(timeoutHelper, "AbortController", "timeout helper fallback controller");
assertIncludes(timeoutHelper, "setTimeout", "timeout helper fallback timer");
assertIncludes(timeoutHelper, "clearTimeout", "timeout helper timer cleanup");
assertIncludes(timeoutHelper, "Promise.race", "timeout helper permanent-pending guard");
assertIncludes(timeoutHelper, "isMobileWebKit", "timeout helper mobile WebKit path");

assertIncludes(screeningFlow, "PROFILE_LOAD_GUARD_MS", "ScreeningFlow defensive guard");
assertIncludes(screeningFlow, "loadNonce", "ScreeningFlow retry");
assertIncludes(screeningFlow, 'translate("common.try_again", "Try again")', "ScreeningFlow retry copy");
assertIncludes(screeningFlow, 'translate("screening.malformed_title"', "ScreeningFlow calm error state");

assertIncludes(localizationProvider, "setLocale: (locale: Locale) => void", "LocalizationProvider controlled setter");
assertIncludes(localizationProvider, 'window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)', "LocalizationProvider explicit locale persistence");
assertIncludes(localizationProvider, "new CustomEvent(LOCALE_EVENT_NAME", "LocalizationProvider locale event detail");
assertIncludes(landingInteractions, "persistExpungementLocale(lang)", "landing language toggle shared persistence");
assert(!localizationProvider.includes("removeItem(LOCALE_STORAGE_KEY"), "English must be persisted explicitly, not represented by removing Spanish state.");

assertIncludes(profileRoute, '"Cache-Control": "no-store, max-age=0"', "profile endpoint cache control");

const serviceWorkerCandidates = [
  "public/sw.js",
  "public/service-worker.js",
  "public/workbox.js",
  "src/app/sw.ts",
  "src/app/service-worker.ts"
];
for (const candidate of serviceWorkerCandidates) {
  assert(!exists(candidate), `Unexpected service worker candidate exists: ${candidate}`);
}

if (failures.length) {
  console.error("Expungement.ai mobile loading + locale hotfix verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai mobile loading + locale hotfix verifier passed.");
console.log(`Stalled profile request settled as ok:false in ${elapsed}ms.`);
console.log("Locale toggles persist explicit en/es values; no service worker candidates found.");
