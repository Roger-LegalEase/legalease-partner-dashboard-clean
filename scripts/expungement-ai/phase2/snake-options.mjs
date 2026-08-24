import { getAllJurisdictionProfiles, projectPublicProfile } from "../flow-audit/lib/engine.mjs";
const seen = new Map();
for (const profile of getAllJurisdictionProfiles()) {
  const pub = projectPublicProfile(profile);
  for (const q of pub.questions ?? []) {
    for (const opt of q.options ?? []) {
      const value = typeof opt === "string" ? opt : opt?.value ?? opt?.id;
      if (typeof value !== "string") continue;
      if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(value)) continue;
      const display = typeof opt === "object" ? (opt.label ?? opt.display ?? null) : (q.optionDisplay?.[value] ?? null);
      if (!seen.has(value)) seen.set(value, { display, questions: new Set() });
      seen.get(value).questions.add(q.id);
    }
  }
}
console.log(`distinct snake_case option values: ${seen.size}`);
for (const [v, meta] of [...seen].sort()) {
  console.log(`  ${v.padEnd(34)} display=${meta.display ?? "NONE"}  questions=${[...meta.questions].slice(0,3).join(",")}`);
}
