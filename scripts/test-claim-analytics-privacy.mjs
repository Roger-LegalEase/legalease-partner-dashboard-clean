import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const token = "PUBLIC_SYNTHETIC_CLAIM_01234567890123456789";
const read = p => fs.readFileSync(p, "utf8");
const sanitizer = ts.createSourceFile("sanitize.ts", read("src/lib/analytics/sanitize.ts"), ts.ScriptTarget.Latest, true);
assert(!sanitizer.statements.some(n => ts.isImportDeclaration(n) || ts.isImportEqualsDeclaration(n)), "existing isomorphic sanitizer has no Node/server/secret dependencies");
assert(read("src/app/layout.tsx").includes("<WebAnalyticsTracker />"), "actual root mounts shared tracker");

function capture({ query = "?utm_source=PUBLIC_FIXTURE&utm_medium=email&state=FL&ref=campaign", referrer = `https://expungement.ai/auth/forgot-password?claim=${token}#private`, dnt = "0", disabled = false, fallback = false } = {}) {
  const sent = [], attempts = [], storage = new Map(), modules = new Map();
  const window = { location: { hostname: "expungement.ai", pathname: "/expungement-ai/sign-in", search: query }, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } };
  const document = { title: "PUBLIC synthetic sign-in", referrer, cookie: "" };
  function load(p) {
    if (modules.has(p)) return modules.get(p);
    const exports = {}; modules.set(p, exports);
    vm.runInNewContext(ts.transpileModule(read(p), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, window, document, process: { env: { NEXT_PUBLIC_WEB_ANALYTICS_DISABLED: disabled ? "true" : undefined } }, crypto: { randomUUID }, Blob, URL, URLSearchParams,
      navigator: { doNotTrack: dnt, sendBeacon(url, body) { attempts.push("beacon"); if (fallback) return false; sent.push({ url, body, via: "beacon" }); return true; } },
      fetch(url, options) { attempts.push("fetch"); sent.push({ url, body: options.body, via: "fetch" }); return Promise.resolve({ ok: true }); },
      require(name) {
        if (name === "react") return { useEffect: effect => effect() };
        if (name === "next/navigation") return { usePathname: () => window.location.pathname };
        assert(name.startsWith("@/"), `unexpected browser dependency ${name}`);
        return load(`src/${name.slice(2)}.ts`);
      }
    });
    return exports;
  }
  const client = load("src/lib/analytics/client.ts");
  load("src/components/analytics/WebAnalyticsTracker.tsx").WebAnalyticsTracker();
  return { sent, client, attempts };
}
async function payload(c, index = 0) {
  assert(c.sent[index], "actual tracker emits an event");
  assert.equal(c.sent[index].url, "/api/analytics/web");
  const raw = typeof c.sent[index].body === "string" ? c.sent[index].body : await c.sent[index].body.text();
  assert(!raw.includes(token), "ANALYTICS-CLAIM-TRANSPORT: opaque claim absent from entire pretransmission payload");
  return JSON.parse(raw);
}

for (const query of [`?claim=${token}&utm_source=PUBLIC_FIXTURE`, `?%63laim=${token}`, "?claim=", `?claim=${token}&claim=another`]) {
  for (const fallback of [false, true]) {
    const held = capture({ query, fallback });
    held.client.trackPageview({ path: "/public-without-a-claim", title: "PUBLIC override" });
    held.client.trackFunnelEvent("screening_started", { state: "FL", product_surface: "expungement_ai" });
    assert.equal(held.attempts.length, 0, "ANALYTICS-CURRENT-CLAIM-NO-TRANSPORT: actual current URL blocks every Beacon/fetch, regardless of extra props");
    assert.equal(held.sent.length, 0);
  }
}
console.log("PASS actual current claim URL blocks mounted tracker, explicit pageview overrides and funnel Beacon/fetch attempts");
if (process.argv.includes("--capability-guard-only")) process.exit(0);

const mounted = capture();
const body = await payload(mounted);
assert.equal(body.path, "/expungement-ai/sign-in");
assert.equal(body.page_title, "PUBLIC synthetic sign-in");
assert.equal(body.referrer, "https://expungement.ai/auth/forgot-password");
assert.deepEqual(Object.fromEntries(new URLSearchParams(body.query)), { utm_source: "PUBLIC_FIXTURE", utm_medium: "email", state: "FL", ref: "campaign" });
assert.equal(body.utm_source, "PUBLIC_FIXTURE");
assert.equal(body.utm_medium, "email");
assert.equal(body.product_surface, "expungement_ai");
console.log("PASS nonclaim mounted tracker sanitizes legacy claim referrer/raw payload, preserves page and safe UTM/state/ref");
for (const query of [`?unallowlisted=${token}&utm_campaign=PUBLIC_CAMPAIGN`, `?next=${encodeURIComponent(`/briefcase?claim=${token}`)}&claimToken=${token}`]) {
  const result = await payload(capture({ query }));
  assert(!new URLSearchParams(result.query).has("claim"));
}
console.log("PASS nonclaim pages retain R4 removal of unallowlisted/nested handoff query capabilities");
const fallback = capture({ fallback: true, referrer: `https://example.invalid/from?claim=${token}` });
assert.equal(fallback.sent[0].via, "fetch");
assert.equal((await payload(fallback)).referrer, "https://example.invalid/from");
console.log("PASS same sanitized payload reaches fetch fallback; no real network");
for (const referrer of ["not a URL", ""]) {
  const result = await payload(capture({ query: `?unallowlisted=${token}`, referrer }));
  assert(!Object.hasOwn(result, "query"));
  assert(!Object.hasOwn(result, "referrer"));
}
console.log("PASS nonclaim pages omit invalid/empty referrer and unallowlisted query fields");
assert.equal(capture({ dnt: "1" }).sent.length, 0);
assert.equal(capture({ disabled: true }).sent.length, 0);
mounted.client.trackFunnelEvent("screening_started", { state: "FL", product_surface: "expungement_ai" });
const funnel = await payload(mounted, 1);
assert.equal(funnel.event_name, "screening_started");
assert.equal(funnel.utm_source, "PUBLIC_FIXTURE");
assert.equal(funnel.state, "FL");
console.log("PASS existing DNT/disable gates and safe funnel/session attribution remain effective");
