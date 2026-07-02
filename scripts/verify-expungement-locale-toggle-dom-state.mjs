import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };

const landing = read("src/app/expungement-ai/ExpungementLandingInteractions.tsx");
const provider = read("src/components/expungement-ai/LocalizationProvider.tsx");

assert(provider.includes('const LOCALE_STORAGE_KEY = "exp_lang"'), "Locale provider must use the single exp_lang key.");
assert(provider.includes("useState<Locale>(() => initialLocale())"), "Provider must initialize from saved locale before hydration effects.");
assert(!provider.includes("navigator.language"), "React locale provider must not override English default from browser language.");
assert(landing.includes("normalizedLang"), "Landing DOM translation must normalize to one locale value.");
assert(landing.includes("root.dataset.expungementAiLocale = normalizedLang"), "Landing must stamp applied DOM locale.");
assert(landing.includes('item.getAttribute("data-lang") === normalizedLang'), "Toggle active state must derive from applied locale.");
assert(landing.includes("persistExpungementLocale(normalizedLang)"), "Clicks must persist the explicit selected locale.");
assert(!landing.includes("navigator.language"), "Landing initial load must not use browser language as a separate locale source.");
assert(!landing.includes("root.dataset.expungementAiLocale === normalizedLang && !options.persist"), "Landing must not skip DOM translation when the dataset is stale.");
assert(!landing.includes("persist: true })") || !landing.includes("applyLanguage(initialLanguage, { persist: true })"), "Initial load must not rebroadcast stale locale.");

if (failures.length) {
  console.error("Expungement.ai locale DOM state verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Expungement.ai locale DOM state verifier passed.");
