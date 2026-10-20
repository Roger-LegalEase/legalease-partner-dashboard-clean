// What a family says about route footers must be what its fixture PDFs print, in both directions. The statements are
// read from participant-instructions.md ("Every page states its own route in its footer", OK's "Every page states in its
// footer every declared route…") and from production-field-map.json (routeSelectionNote and every statedOn, e.g.
// "…in their titles, bodies and footers"). A promise needs a route footer on the pages it names; "no page prints a route
// footer" needs none on any page; "continuation pages have/carry no route footer/marker" needs none past each
// component's first page; OK's "closes with "Routes this set serves"" needs exactly each set's routes on each multi-route
// component's last page and nowhere else. A rerender that drops footers while a record still promises them (NV, OK
// juvenile), or a record that promises footers the bytes never carried (GA YFO, DE 1017a), fails here.
//
//   node scripts/test-route-footer-sentence.mjs        (needs pdftotext from poppler-utils)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const PROMISE = /every page states\b[^.]*\bin its footer/i;
// A field-map clause promises a footer if one is still named once each denial phrase is struck out ("no page prints a route
// footer", "Continuation pages have no route footer"): "…the footer, and the official pages print no footer" still
// promises, and so does "…body and footer, and no election control…".
const FOOTER_DENIALS = /\b(?:no|without)\b[^.;,]*\bfooters?\b/gi;
const NONE_ANYWHERE = /\bno page prints a route footer\b/i;
const NONE_ON_CONTINUATION = /\bcontinuation pages (?:have|carry) no route (?:footer|marker)\b/i;
const CLOSES_WITH_ROUTES = 'closes with "Routes this set serves"';
export function statements(instructions, fieldMap) {
  const fm = [fieldMap?.routeSelectionNote, ...(fieldMap?.routeSelectionsMade ?? []).map((r) => r?.statedOn)].filter(Boolean).join(". ");
  const clauses = fm.split(/[.;]/);
  return {
    everyPage: PROMISE.test(instructions),
    promise: PROMISE.test(instructions) || clauses.some((c) => /\bfooters?\b/i.test(c.replace(FOOTER_DENIALS, ""))),
    noneAnywhere: NONE_ANYWHERE.test(instructions) || NONE_ANYWHERE.test(fm),
    noneOnContinuation: NONE_ON_CONTINUATION.test(instructions) || NONE_ON_CONTINUATION.test(fm),
    closesWithRoutes: instructions.includes(CLOSES_WITH_ROUTES)
  };
}
for (const s of ["Every page states its own route in its footer", "Every page states in its footer every declared route the set it belongs to serves"])
  assert(statements(s, null).promise, `"${s}" must read as a footer promise`);
assert(statements('Where a set serves more than one route, the last page of each of its components closes with "Routes this set serves" and lists every declared route that set serves', null).closesWithRoutes, "OK's closing route-list sentence must be read");
for (const [note, want] of [
  ["the composed pages for this route, in their titles, bodies and footers", { promise: true }],
  ["One route, one instrument set: the petition states this route's statutory ground in its own title, body and footer, and no election control exists on any composed page", { promise: true }],
  ["the composed petition and filing instructions, in their titles and bodies; no page prints a route footer", { promise: false, noneAnywhere: true }],
  ["the first-page title of each component for this route. Continuation pages have no route footer; keep each component's pages together, in order.", { promise: false, noneOnContinuation: true }],
  ["the first-page title of each component for this route; continuation pages carry no route marker", { promise: false, noneOnContinuation: true }],
  ["the composed pages, in the title, the body and the footer, and the official form pages print no footer", { promise: true }]
]) for (const [k, v] of Object.entries(want)) assert.equal(statements("", { routeSelectionsMade: [{ statedOn: note }] })[k], v, `"${note}" must read as ${k}=${v}`);

const ROOT = "data/rcap-all50/overlays/census-v1";
// Any form, key or readable label, any case: a key-only or case-sensitive probe misreads KS and "ROUTE:".
// A footer sits at the page foot: every fixture footer is among its page's last 3 non-empty lines (2026-10-20: 220 last,
// 30 second, 4 third of 254), so a body line that starts "Route:" cannot stand in for a dropped footer.
const FOOT_LINES = 3;
const footLines = (text) => text.split("\n").filter((l) => l.trim()).slice(-FOOT_LINES);
const hasRoute = (text) => footLines(text).some((l) => /^\s*route:/i.test(l));
// A denial is broken by any route mark at the foot, not only "Route:" ("Route - …", "Route — …", a bare "Route" label).
const hasRouteMark = (text) => footLines(text).some((l) => /^\s*route\b/i.test(l));

// Pages that must carry a footer. "Every page states…" owes one on every page. Otherwise a footer on any page that is not
// its component's last page means the family prints one on every page; else it prints one on each component's last page.
// Losing every non-final footer at once reads as the second form, which a field-map "…and footers" also describes.
export function requiredFooterPages(pages, manifest, saysEveryPage = false) {
  const last = manifest.map((m, i) => manifest[i + 1]?.component !== m.component);
  const everyPage = saysEveryPage || pages.some((text, i) => !last[i] && hasRoute(text));
  return pages.map((_, i) => i + 1).filter((p) => everyPage || last[p - 1]);
}
export function missingFooterPages(said, pages, manifest) {
  if (!said.promise) return [];
  return requiredFooterPages(pages, manifest, said.everyPage).filter((p) => !hasRoute(pages[p - 1]));
}
// Pages that print a footer the statements deny.
export function deniedFooterPages(said, pages, manifest) {
  const first = manifest.map((m, i) => manifest[i - 1]?.component !== m.component);
  return pages.map((t, i) => i + 1).filter((p) => hasRouteMark(pages[p - 1]) && (said.noneAnywhere || (said.noneOnContinuation && !first[p - 1])));
}

// OK: "the last page of each of its components closes with "Routes this set serves" and lists every declared route that
// set serves; a set that serves one route lists none on its pages … No other page lists a declared route." Read from
// pdftotext -layout, where a key wrapped at a hyphen keeps it ("dismissal-\n   expungement").
const ROUTE_KEY = /obligation:[a-z-]+:[A-Z]{2}:[A-Za-z0-9_:-]+/g, HAS_KEY = new RegExp(ROUTE_KEY.source);
export function routeListProblems(layoutPages, manifest, served) {
  const problems = [];
  layoutPages.forEach((text, i) => {
    const component = manifest[i].component, last = manifest[i + 1]?.component !== component;
    const routes = served[component];
    if (!routes) { problems.push(`p${i + 1} ${component}: the field map names no served routes`); return; }
    const at = text.indexOf("Routes this set serves");
    if (!(last && routes.length > 1)) {
      if (at >= 0 || HAS_KEY.test(text)) problems.push(`p${i + 1} ${component}: lists a route it must not`);
      return;
    }
    if (at < 0) { problems.push(`p${i + 1} ${component}: does not close with "Routes this set serves"`); return; }
    if (HAS_KEY.test(text.slice(0, at))) problems.push(`p${i + 1} ${component}: lists a route above the closing list`);
    const tail = text.slice(at).replace(/-\n\s*/g, "-"), head = tail.match(/^Routes this set serves \((\d+)\):/);
    const keys = tail.match(ROUTE_KEY) ?? [], rest = tail.slice(head?.[0].length ?? 0).replace(ROUTE_KEY, "").replace(/[\s;]/g, "");
    if (Number(head?.[1]) !== routes.length || JSON.stringify(keys) !== JSON.stringify(routes) || rest)
      problems.push(`p${i + 1} ${component}: closes with ${head?.[0] ?? "no count"} ${JSON.stringify(keys)}${rest ? ` then "${rest.slice(0, 40)}"` : ""}, not its ${routes.length} routes`);
  });
  return problems;
}

// Records known to say more than their pages print, each with its reason. They are reported, not failed; a listed family
// that stops failing must be removed from this list.
const SCORED = "ruled scored 2026-10-20T21:32:51Z (footers promised, none printed); repaired at its own next VF read";
const KNOWN_UNREPAIRED = new Map([
  ["az/az-wrongful-arrest-clearance-set--custom-pleading", SCORED],
  ["ga/rcap-ga-guidance-implementation--custom-pleading", SCORED],
  ["ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading", SCORED],
  ["wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading", SCORED],
  ...["nd/rcap-nd-custom-pleading--custom-pleading", "sc/rcap-sc-custom-pleading--custom-pleading", "wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading"].map((k) => [k,
    "held for Roger (A33, 2026-10-20T23:00:14Z): the instructions say every page states its route in its footer; footers print on component-final pages only, and a rebuild drops them (86006af26), so no FIX-only sentence exists"])
]);

const families = [];
for (const state of fs.readdirSync(ROOT).sort()) {
  for (const family of fs.readdirSync(path.join(ROOT, state)).sort()) {
    const dir = path.join(ROOT, state, family), read = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), "utf8") : null);
    const instructions = read("participant-instructions.md") ?? "", fieldMapText = read("production-field-map.json");
    const fieldMap = fieldMapText ? JSON.parse(fieldMapText) : null, said = statements(instructions, fieldMap);
    if (!said.promise && !said.noneAnywhere && !said.noneOnContinuation && !said.closesWithRoutes) continue;
    const reportText = read("reports/rendered-artifacts.json");
    assert(reportText, `${dir}: it states where routes are printed but has no reports/rendered-artifacts.json to hold it to`);
    const report = JSON.parse(reportText);
    const fixtures = fs.readdirSync(path.join(dir, "fixtures")).filter((f) => f.endsWith(".pdf")).sort();
    assert(fixtures.length > 0, `${dir}: it states where routes are printed but there is no fixture PDF to hold it to`);
    for (const file of fixtures) {
      const pdf = path.join(dir, "fixtures", file), bytes = fs.readFileSync(pdf);
      const artifact = (report.artifacts ?? []).find((a) => a.fixture === file.slice(0, -4));
      // The page manifest must describe these exact bytes, or component boundaries are guesses.
      assert.equal(artifact?.sha256, createHash("sha256").update(bytes).digest("hex"), `${pdf}: rendered-artifacts.json does not bind these bytes`);
      const text = (...flags) => execFileSync("pdftotext", [...flags, pdf, "-"], { encoding: "utf8", maxBuffer: 64e6 }).split("\f").slice(0, -1);
      const pages = text();
      assert.equal(pages.length, artifact.pageManifest.length, `${pdf}: page manifest and PDF page count differ`);
      families.push({ pdf, key: `${state}/${family}`, said, pages, manifest: artifact.pageManifest,
        layoutPages: said.closesWithRoutes ? text("-layout") : null, served: fieldMap?.componentRoutesServed ?? {} });
    }
  }
}
assert(families.length > 0, "no overlay states where routes are printed; retire this guard");

const findings = (f) => ({ pdf: f.pdf, missing: missingFooterPages(f.said, f.pages, f.manifest), denied: deniedFooterPages(f.said, f.pages, f.manifest),
  routeList: f.layoutPages ? routeListProblems(f.layoutPages, f.manifest, f.served) : [] });
const failing = (r) => r.missing.length || r.denied.length || r.routeList.length;
const results = families.map((f) => ({ key: f.key, ...findings(f) }));
assert.deepEqual(results.filter((r) => failing(r) && !KNOWN_UNREPAIRED.has(r.key)).map(({ key, ...r }) => r), [], "a record says something about route footers that these pages do not bear out");
const repaired = [...KNOWN_UNREPAIRED.keys()].filter((k) => !results.some((r) => r.key === k && failing(r)));
assert.deepEqual(repaired, [], "these KNOWN_UNREPAIRED families no longer fail: remove them from the list");

// Self-check on the real fixture text: the guard tracks what is said, not the footer alone.
const strip = (text) => text.replace(/^(\s*)route:/gim, "$1");
const withFoot = (t, mark = "Route: obligation:x") => `${t}\n${mark}\n`;
for (const f of families.filter((x) => !KNOWN_UNREPAIRED.has(x.key))) {
  const finals = f.manifest.map((m, i) => (f.manifest[i + 1]?.component !== m.component ? i + 1 : null)).filter(Boolean);
  const all = f.pages.map((_, i) => i + 1);
  if (f.said.promise) {
    const required = requiredFooterPages(f.pages, f.manifest, f.said.everyPage);
    assert.deepEqual(required, f.pages.map((t, i) => (hasRoute(t) ? i + 1 : null)).filter(Boolean), `${f.pdf}: the guard must cover every footer the family prints`);
    for (const p of required) {
      assert.deepEqual(missingFooterPages(f.said, f.pages.map((t, i) => (i === p - 1 ? strip(t) : t)), f.manifest), [p], `${f.pdf}: dropping page ${p}'s footer must fail`);
      // A fixed 2-line pad, not FOOT_LINES: on SC's 1-line footer pages the body line sits 4th from the foot, so any wider window fails here.
      const body = "Route: a body line\nbody\nbody\n";
      assert.deepEqual(missingFooterPages(f.said, f.pages.map((t, i) => (i === p - 1 ? body + strip(t) : t)), f.manifest), [p], `${f.pdf}: a body line starting "Route:" must not stand in for page ${p}'s footer`);
      assert.deepEqual(missingFooterPages(f.said, f.pages.map((t, i) => (i === p - 1 ? `${strip(t)}\nfiled under route: obligation:x\n` : t)), f.manifest), [p], `${f.pdf}: "route:" inside a foot line is not page ${p}'s footer`);
    }
    assert.deepEqual(missingFooterPages(f.said, f.pages.map(strip), f.manifest), f.said.everyPage ? all : finals, `${f.pdf}: dropping every footer must fail`);
    // ND, SC and WA before A33: "every page" said, footers on component-final pages only.
    if (f.said.everyPage) assert.deepEqual(missingFooterPages(f.said, f.pages.map((t, i) => (finals.includes(i + 1) ? t : strip(t))), f.manifest), all.filter((p) => !finals.includes(p)), `${f.pdf}: footers on component-final pages only must fail "every page"`);
    assert.deepEqual(missingFooterPages({ ...f.said, promise: false }, f.pages.map(strip), f.manifest), [], `${f.pdf}: no promise, no footer owed`);
    assert.deepEqual(missingFooterPages(f.said, f.pages.map((t) => t.replace(/^(\s*)route:/gim, "$1ROUTE:")), f.manifest), [], `${f.pdf}: an upper-case ROUTE: footer still counts`);
  }
  for (const mark of ["Route: obligation:x", "Route - x", "ROUTE — x"]) {
    if (f.said.noneAnywhere) assert.deepEqual(deniedFooterPages(f.said, f.pages.map((t, i) => (i === 0 ? withFoot(t, mark) : t)), f.manifest), [1], `${f.pdf}: a "${mark}" footer on page 1 must fail "no page prints a route footer"`);
    const cont = f.manifest.findIndex((m, i) => i > 0 && f.manifest[i - 1].component === m.component);
    if (f.said.noneOnContinuation && cont >= 0) assert.deepEqual(deniedFooterPages(f.said, f.pages.map((t, i) => (i === cont ? withFoot(t, mark) : t)), f.manifest), [cont + 1], `${f.pdf}: a "${mark}" footer on continuation page ${cont + 1} must fail`);
  }
  if (f.said.noneOnContinuation) {
    assert.deepEqual(deniedFooterPages({ ...f.said, noneAnywhere: false }, f.pages.map((t, i) => (i === 0 ? withFoot(t) : t)), f.manifest), [], `${f.pdf}: a footer on a first page is not a continuation footer`);
  }
  if (f.layoutPages) {
    const listed = f.layoutPages.map((t, i) => (t.includes("Routes this set serves") ? i : -1)).filter((i) => i >= 0);
    const single = finals.map((p) => p - 1).find((i) => f.served[f.manifest[i].component]?.length === 1);
    assert(listed.length > 0 && single !== undefined, `${f.pdf}: the self-check needs a listing page and a single-route last page`);
    const mutate = (i, edit) => routeListProblems(f.layoutPages.map((t, j) => (j === i ? edit(t) : t)), f.manifest, f.served).length > 0;
    const at = (t) => t.indexOf("Routes this set serves");
    assert(mutate(listed[0], (t) => t.slice(0, at(t))), `${f.pdf}: dropping p${listed[0] + 1}'s route list must fail`);
    assert(mutate(listed[0], (t) => t.replace(/\s*;\s*obligation:[^;]*$/, "")), `${f.pdf}: dropping the last route from p${listed[0] + 1}'s list must fail`);
    assert(mutate(listed[0], (t) => `${t}\nfiled under the set`), `${f.pdf}: text after p${listed[0] + 1}'s list must fail`);
    assert(mutate(listed[0], (t) => t.replace(/Routes this set serves \(\d+\)/, "Routes this set serves (99)")), `${f.pdf}: a wrong count on p${listed[0] + 1}'s list must fail`);
    assert(mutate(listed[0], (t) => `${f.served[f.manifest[listed[0]].component][0]}\n${t}`), `${f.pdf}: a route key above p${listed[0] + 1}'s list must fail`);
    assert(mutate(single, (t) => `${t}\nRoutes this set serves (1): ${f.served[f.manifest[single].component][0]}`), `${f.pdf}: a route list on single-route p${single + 1} must fail`);
  }
}
console.log(JSON.stringify({ status: "PASS_ROUTE_FOOTER_SENTENCE", fixtures: families.length,
  knownUnrepaired: results.filter((r) => KNOWN_UNREPAIRED.has(r.key)).map((r) => ({ pdf: r.pdf, missing: r.missing.length, denied: r.denied.length, reason: KNOWN_UNREPAIRED.get(r.key) })),
  checked: families.map((f) => ({ pdf: f.pdf, pages: f.pages.length, footerPages: f.pages.filter(hasRoute).length,
    said: Object.keys(f.said).filter((k) => f.said[k]).join("+") })) }));
