#!/usr/bin/env node
/**
 * The formal visual-review bundle for a Grade-A route cohort.
 *
 * Every other proof in this factory is a measurement. This one is not: a named
 * human has to look at every page and say whether it is fit to file. So this
 * script does not decide anything -- it builds the surface on which a reviewer
 * decides, and it binds that surface to the exact bytes under review.
 *
 * WHAT IS BOUND, AND WHY IT MATTERS. A review of "the Kansas packet" proves
 * nothing later, because the packet moves. Every page card therefore carries
 * the SHA-256 of the fixture PDF the page was rendered from and the SHA-256 of
 * the rendered image itself, and the bundle carries the family's route keys and
 * source identity. A returned review names bytes, so a rebuild that changes
 * those bytes visibly invalidates it instead of silently inheriting it.
 *
 * WHY THE PAGES ARE RENDERED HERE. These three families were rastered in CI and
 * their acceptance receipts bind hashes rather than images, so there is no local
 * page imagery to show. The renders are produced from the same pinned fixture
 * bytes the receipt names, and the script refuses to emit a bundle whose fixture
 * digest does not match the one recorded for the family.
 *
 * WHY ONE BUNDLE PER FIXTURE. A published page carries its images inline, and
 * the ceiling is 16MB. South Carolina and Tennessee are 62-65 pages per fixture,
 * so a single all-in-one bundle could only be built by degrading the imagery --
 * on a review whose entire purpose is seeing whether a box is ticked or a line
 * is clipped. Splitting by fixture keeps full render fidelity.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-visual-review-bundle.mjs \
 *     --pages /tmp/vrb-pages --out /tmp/vrb-html
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const PAGES = arg("--pages", "/tmp/vrb-pages");
const OUT = arg("--out", "/tmp/vrb-html");
const QUALITY = arg("--quality", "85");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const returns = read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const COHORT = ["rcap-ks-custom-pleading", "rcap-sc-custom-pleading", "rcap-tn-custom-pleading"];
const verdictOf = new Map();
for (const r of returns.rows ?? []) if (r.isIndependentVerification && r.verdict && !r.superseded) verdictOf.set(r.familyId, r);

fs.mkdirSync(OUT, { recursive: true });
const emitted = [];

for (const familyId of COHORT) {
  const f = master.families.find((x) => x.familyId === familyId);
  if (!f) throw new Error(`${familyId} is not in the master queue`);
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, f.directory, "reports/rendered-artifacts.json"), "utf8"));
  const fixtures = (art.artifacts ?? art.pdfs ?? []);
  const verdict = verdictOf.get(familyId) ?? null;

  for (const fixtureKind of ["canonical", "boundary"]) {
    const declared = fixtures.find((a) => a.fixture === fixtureKind);
    if (!declared) { console.error(`  ${familyId}: no ${fixtureKind} fixture declared — skipped`); continue; }

    /* The bundle names bytes. If the fixture on disk is not the fixture the
     * family's own render report declares, the imagery below would show one
     * packet while the record named another, so refuse rather than publish a
     * review nobody could rely on. */
    const fixturePath = path.join(ROOT, f.directory, "fixtures", `${fixtureKind}.pdf`);
    const fixtureSha = sha(fixturePath);
    if (declared.sha256 && declared.sha256 !== fixtureSha)
      throw new Error(`${familyId}/${fixtureKind}: fixture on disk is ${fixtureSha.slice(0, 12)} but the render report declares ${String(declared.sha256).slice(0, 12)}`);

    const dir = path.join(PAGES, familyId, fixtureKind);
    const imgs = fs.readdirSync(dir).filter((n) => n.endsWith(`.q${QUALITY}.jpg`))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (imgs.length === 0) throw new Error(`${familyId}/${fixtureKind}: no rendered pages in ${dir}`);
    if (declared.pageCount && imgs.length !== declared.pageCount)
      throw new Error(`${familyId}/${fixtureKind}: rendered ${imgs.length} page(s) but the report declares ${declared.pageCount}`);

    const pages = imgs.map((name, i) => {
      const p = path.join(dir, name);
      return {
        n: i + 1,
        pageSha: sha(p),
        dataUri: `data:image/jpeg;base64,${fs.readFileSync(p).toString("base64")}`
      };
    });

    const bundleId = `${familyId}--${fixtureKind}`;
    const html = renderBundle({ f, familyId, fixtureKind, fixtureSha, declared, pages, verdict, art });
    const file = path.join(OUT, `${bundleId}.html`);
    fs.writeFileSync(file, html);
    const bytes = fs.statSync(file).size;
    emitted.push({ familyId, fixtureKind, file, pages: pages.length, megabytes: +(bytes / 1048576).toFixed(2), fixtureSha });
    console.log(`  ${bundleId.padEnd(44)} ${String(pages.length).padStart(3)} pages  ${(bytes / 1048576).toFixed(2)} MB`);
    if (bytes > 16 * 1048576) console.error("    OVER THE 16MB PUBLISH CEILING — lower --quality or split further");
  }
}

fs.writeFileSync(path.join(OUT, "INDEX.json"), `${JSON.stringify({
  schemaVersion: "rcap-visual-review-bundle-index/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-visual-review-bundle.mjs",
  cohort: COHORT,
  totalPages: emitted.reduce((n, e) => n + e.pages, 0),
  bundles: emitted,
  whatAReturnedReviewProves: "That a named human looked at every page of the exact fixture bytes named here and judged it fit to file. It proves nothing about any other bytes: a rebuild that changes a fixture digest invalidates the review of that fixture.",
  whatItDoesNotDo: "It opens no commercial route, sets no price, and grants no payment or sponsorship eligibility. It satisfies one of the conditions a Grade-A fulfilment record requires and none of the others."
}, null, 2)}\n`);
console.log(`\n${emitted.length} bundle(s), ${emitted.reduce((n, e) => n + e.pages, 0)} pages total -> ${OUT}`);

function renderBundle({ f, familyId, fixtureKind, fixtureSha, declared, pages, verdict, art }) {
  const routes = f.routeKeys ?? [];
  const sources = (f.sourceReadiness?.boundSources ?? []).map((b) => ({ id: b.sourceId, sha: b.sha256 }));
  /* The gallery shows the title beside dozens of other artifacts, so it names
   * the state rather than its postal code: "Kansas Canonical Page Review" is
   * findable at a glance where "KS" is not. */
  const STATE_NAMES = { KS: "Kansas", SC: "South Carolina", TN: "Tennessee" };
  const code = String(f.jurisdiction ?? "").split("/")[0];
  const state = esc(STATE_NAMES[code] ?? code);
  const title = `${state} ${fixtureKind === "canonical" ? "Canonical" : "Boundary"} Page Review`;

  const pageCards = pages.map((p) => `
      <article class="page" id="p${p.n}" data-page="${p.n}">
        <header class="page-head">
          <span class="pnum">Page ${p.n}<span class="of"> of ${pages.length}</span></span>
          <code class="hash" title="SHA-256 of this rendered page">${esc(p.pageSha)}</code>
        </header>
        <img loading="lazy" alt="${esc(familyId)} ${esc(fixtureKind)} page ${p.n}" src="${p.dataUri}">
        <div class="controls" role="group" aria-label="Verdict for page ${p.n}">
          <button type="button" class="mark pass" data-mark="PASS" data-page="${p.n}">Fit to file</button>
          <button type="button" class="mark fail" data-mark="FAIL" data-page="${p.n}">Not fit</button>
          <button type="button" class="mark note" data-mark="COMMENT" data-page="${p.n}">Comment</button>
          <input class="comment" data-page="${p.n}" type="text" placeholder="What is wrong with this page?" aria-label="Comment on page ${p.n}">
        </div>
      </article>`).join("");

  return `<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    --paper: #f7f6f3; --raised: #fffefb; --ink: #1a1d1a; --ink-soft: #52584f;
    --rule: #d9dbd4; --rule-strong: #b9bdb3;
    --accent: #2f5d50; --accent-soft: #e4ece8;
    --pass: #2c6e49; --fail: #a03027; --note: #8a6d1f;
    --pass-soft: #e3f0e7; --fail-soft: #f6e4e2; --note-soft: #f6eeda;
    --shadow: 0 1px 2px rgba(26,29,26,.06), 0 8px 24px rgba(26,29,26,.05);
    --display: "Newsreader", Georgia, "Times New Roman", serif;
    --ui: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper: #141714; --raised: #1c211d; --ink: #e9ebe6; --ink-soft: #a3aa9f;
      --rule: #2c322d; --rule-strong: #3f473f;
      --accent: #7fb8a4; --accent-soft: #1f2a26;
      --pass: #74c48f; --fail: #e08a80; --note: #d6b459;
      --pass-soft: #1c2a20; --fail-soft: #2c1e1c; --note-soft: #2a2417;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3);
    }
  }
  :root[data-theme="dark"] {
    --paper: #141714; --raised: #1c211d; --ink: #e9ebe6; --ink-soft: #a3aa9f;
    --rule: #2c322d; --rule-strong: #3f473f;
    --accent: #7fb8a4; --accent-soft: #1f2a26;
    --pass: #74c48f; --fail: #e08a80; --note: #d6b459;
    --pass-soft: #1c2a20; --fail-soft: #2c1e1c; --note-soft: #2a2417;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3);
  }
  * { box-sizing: border-box; }
  body { background: var(--paper); color: var(--ink); font-family: var(--ui); line-height: 1.5; }
  .wrap { display: grid; grid-template-columns: minmax(0,1fr) 21rem; gap: 2.5rem; max-width: 76rem; margin: 0 auto; padding: 2rem 1.5rem 6rem; align-items: start; }
  @media (max-width: 60rem) { .wrap { grid-template-columns: minmax(0,1fr); } .rail { position: static; order: -1; } }

  .masthead { grid-column: 1 / -1; border-bottom: 2px solid var(--rule-strong); padding-bottom: 1.25rem; margin-bottom: .5rem; }
  .eyebrow { font-size: .72rem; letter-spacing: .13em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
  h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 1.12; margin: .35rem 0 .5rem; text-wrap: balance; }
  .standfirst { color: var(--ink-soft); max-width: 60ch; font-size: .97rem; }

  .facts { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0 2rem; border-bottom: 1px solid var(--rule); padding-bottom: 1.25rem; }
  .fact { padding: .7rem 0; border-top: 1px solid var(--rule); }
  .fact:first-child, .fact:nth-child(2), .fact:nth-child(3) { border-top: none; }
  .fact dt { font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; }
  .fact dd { margin: .2rem 0 0; font-family: var(--mono); font-size: .8rem; word-break: break-all; }

  .pages { display: flex; flex-direction: column; gap: 2rem; min-width: 0; }
  .page { background: var(--raised); border: 1px solid var(--rule); border-radius: 3px; box-shadow: var(--shadow); overflow: hidden; scroll-margin-top: 1rem; }
  .page[data-verdict="PASS"] { border-left: 4px solid var(--pass); }
  .page[data-verdict="FAIL"] { border-left: 4px solid var(--fail); }
  .page[data-verdict="COMMENT"] { border-left: 4px solid var(--note); }
  .page-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .6rem .9rem; border-bottom: 1px solid var(--rule); flex-wrap: wrap; }
  .pnum { font-family: var(--display); font-size: 1.05rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .of { color: var(--ink-soft); font-weight: 400; font-size: .85rem; }
  .hash { font-family: var(--mono); font-size: .68rem; color: var(--ink-soft); word-break: break-all; }
  .page img { display: block; width: 100%; height: auto; background: #fff; }
  .controls { display: flex; gap: .5rem; padding: .75rem .9rem; border-top: 1px solid var(--rule); flex-wrap: wrap; align-items: center; }
  .mark { font-family: var(--ui); font-size: .82rem; font-weight: 500; padding: .4rem .8rem; border-radius: 2px; border: 1px solid var(--rule-strong); background: transparent; color: var(--ink); cursor: pointer; }
  .mark:hover { border-color: var(--ink-soft); }
  .mark:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mark.pass[aria-pressed="true"] { background: var(--pass-soft); border-color: var(--pass); color: var(--pass); }
  .mark.fail[aria-pressed="true"] { background: var(--fail-soft); border-color: var(--fail); color: var(--fail); }
  .mark.note[aria-pressed="true"] { background: var(--note-soft); border-color: var(--note); color: var(--note); }
  .comment { flex: 1 1 14rem; min-width: 0; font-family: var(--ui); font-size: .82rem; padding: .4rem .6rem; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper); color: var(--ink); }
  .comment:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .rail { position: sticky; top: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--raised); border: 1px solid var(--rule); border-radius: 3px; padding: 1rem; }
  .card h2 { font-family: var(--display); font-size: 1.05rem; font-weight: 600; margin: 0 0 .6rem; }
  label.field { display: block; font-size: .72rem; letter-spacing: .09em; text-transform: uppercase; color: var(--ink-soft); font-weight: 600; margin-bottom: .25rem; }
  input.name { width: 100%; font-family: var(--ui); font-size: .9rem; padding: .45rem .6rem; border: 1px solid var(--rule-strong); border-radius: 2px; background: var(--paper); color: var(--ink); }
  input.name:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .tally { display: flex; gap: 1.25rem; margin-top: .9rem; font-variant-numeric: tabular-nums; }
  .tally div { display: flex; flex-direction: column; }
  .tally b { font-family: var(--display); font-size: 1.5rem; font-weight: 600; line-height: 1; }
  .tally span { font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); margin-top: .2rem; }
  .t-pass b { color: var(--pass); } .t-fail b { color: var(--fail); } .t-left b { color: var(--ink-soft); }
  .bar { height: 4px; background: var(--rule); border-radius: 2px; overflow: hidden; margin-top: .9rem; }
  .bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .2s; }
  .status { font-size: .8rem; color: var(--ink-soft); margin-top: .7rem; }
  .keys { font-size: .74rem; color: var(--ink-soft); line-height: 1.7; }
  .keys kbd { font-family: var(--mono); font-size: .72rem; border: 1px solid var(--rule-strong); border-bottom-width: 2px; border-radius: 3px; padding: 0 .3rem; }
  .caveat { grid-column: 1 / -1; border-top: 1px solid var(--rule); padding-top: 1rem; color: var(--ink-soft); font-size: .84rem; max-width: 66ch; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="wrap">
  <div class="masthead">
    <div class="eyebrow">Grade A first cohort &middot; formal visual review</div>
    <h1>${esc(state)} ${fixtureKind === "canonical" ? "canonical" : "boundary"} output</h1>
    <p class="standfirst">Every page of this packet, rendered from the exact fixture bytes named below. Mark each one fit to file or not. Nothing here is decided by measurement &mdash; this is the one proof the factory cannot produce for itself.</p>
  </div>

  <dl class="facts">
    <div class="fact"><dt>Packet family</dt><dd>${esc(familyId)}</dd></div>
    <div class="fact"><dt>Fixture</dt><dd>${esc(fixtureKind)}.pdf &middot; ${pages.length} pages</dd></div>
    <div class="fact"><dt>Fixture SHA-256</dt><dd>${esc(fixtureSha)}</dd></div>
    <div class="fact"><dt>Routes served</dt><dd>${routes.length}</dd></div>
    <div class="fact"><dt>Independent verdict</dt><dd>${esc(verdict ? `${verdict.verdict} · ${verdict.lane}` : "none recorded")}</dd></div>
    <div class="fact"><dt>Verified at base</dt><dd>${esc(verdict?.verifiedAtBase ?? "not declared")}</dd></div>
    ${sources.length ? `<div class="fact"><dt>Bound sources</dt><dd>${sources.map((s) => esc(`${s.id} ${String(s.sha).slice(0, 12)}`)).join("<br>")}</dd></div>` : ""}
    <div class="fact"><dt>Delivery type</dt><dd>${esc(f.implementationStrategy ?? "—")}</dd></div>
  </dl>

  <main class="pages">${pageCards}</main>

  <aside class="rail">
    <div class="card">
      <h2>Reviewer</h2>
      <label class="field" for="reviewer">Your name</label>
      <input class="name" id="reviewer" type="text" placeholder="e.g. Roger Roman" autocomplete="name">
      <div class="tally">
        <div class="t-pass"><b id="n-pass">0</b><span>Fit</span></div>
        <div class="t-fail"><b id="n-fail">0</b><span>Not fit</span></div>
        <div class="t-left"><b id="n-left">${pages.length}</b><span>Unseen</span></div>
      </div>
      <div class="bar"><i id="bar"></i></div>
      <p class="status" id="status">Nothing recorded yet.</p>
    </div>
    <div class="card">
      <h2>Moving through it</h2>
      <p class="keys">
        <kbd>J</kbd> next page &middot; <kbd>K</kbd> previous<br>
        <kbd>P</kbd> fit to file &middot; <kbd>F</kbd> not fit<br>
        Marking a page moves you to the next one.
      </p>
    </div>
  </aside>

  <p class="caveat">A completed review proves that a named person looked at every page of these exact bytes. It proves nothing about any other bytes: if a repair changes this fixture&rsquo;s digest, the review of that fixture lapses. It opens no route, sets no price, and grants no payment or sponsorship eligibility.</p>
</div>

<script>
(function () {
  var BUNDLE = ${JSON.stringify(`${familyId}--${fixtureKind}`)};
  var FIXTURE_SHA = ${JSON.stringify(fixtureSha)};
  var TOTAL = ${pages.length};
  var marks = Object.create(null);
  var db = null;
  var statusEl = document.getElementById("status");
  var reviewerEl = document.getElementById("reviewer");

  function setStatus(t) { statusEl.textContent = t; }

  function tally() {
    var pass = 0, fail = 0, seen = 0;
    for (var k in marks) { seen++; if (marks[k].mark === "PASS") pass++; else if (marks[k].mark === "FAIL") fail++; }
    document.getElementById("n-pass").textContent = pass;
    document.getElementById("n-fail").textContent = fail;
    document.getElementById("n-left").textContent = TOTAL - seen;
    document.getElementById("bar").style.width = (TOTAL ? (seen / TOTAL) * 100 : 0) + "%";
    return { pass: pass, fail: fail, seen: seen };
  }

  function paint(n) {
    var card = document.getElementById("p" + n);
    if (!card) return;
    var m = marks[n];
    if (m) card.setAttribute("data-verdict", m.mark); else card.removeAttribute("data-verdict");
    var btns = card.querySelectorAll(".mark");
    for (var i = 0; i < btns.length; i++)
      btns[i].setAttribute("aria-pressed", String(!!m && btns[i].dataset.mark === m.mark));
    var c = card.querySelector(".comment");
    if (m && m.comment && c.value !== m.comment) c.value = m.comment;
  }

  function save(n) {
    if (!db) return;
    var rec = marks[n];
    db.doc("data/review/" + BUNDLE + "/pages/" + n).set({
      bundle: BUNDLE, fixtureSha256: FIXTURE_SHA, page: n,
      mark: rec.mark, comment: rec.comment || "",
      reviewer: (reviewerEl.value || "").trim(),
      markedAt: new Date().toISOString()
    }).then(function () { setStatus("Saved page " + n + "."); },
            function () { setStatus("Page " + n + " is marked here but could not be saved."); });
  }

  function mark(n, verdict) {
    var c = document.getElementById("p" + n).querySelector(".comment");
    marks[n] = { mark: verdict, comment: (c.value || "").trim() };
    paint(n); tally(); save(n);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".mark") : null;
    if (!b) return;
    var n = Number(b.dataset.page);
    mark(n, b.dataset.mark);
    if (b.dataset.mark !== "COMMENT") {
      var next = document.getElementById("p" + (n + 1));
      if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  document.addEventListener("change", function (e) {
    if (!e.target.classList || !e.target.classList.contains("comment")) return;
    var n = Number(e.target.dataset.page);
    if (marks[n]) { marks[n].comment = e.target.value.trim(); save(n); }
  });

  function currentPage() {
    var cards = document.querySelectorAll(".page");
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (r.bottom > 80) return Number(cards[i].dataset.page);
    }
    return TOTAL;
  }
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    var k = e.key.toLowerCase(), n = currentPage(), t;
    if (k === "j") { t = document.getElementById("p" + (n + 1)); }
    else if (k === "k") { t = document.getElementById("p" + Math.max(1, n - 1)); }
    else if (k === "p") { mark(n, "PASS"); t = document.getElementById("p" + (n + 1)); }
    else if (k === "f") { mark(n, "FAIL"); t = document.getElementById("p" + (n + 1)); }
    else return;
    e.preventDefault();
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  tally();

  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("db").then(function (d) {
      db = d;
      if (!db) { setStatus("Marks show here but are not being saved from this view."); return; }
      return db.collection("data/review/" + BUNDLE + "/pages").get().then(function (docs) {
        var found = 0;
        (docs || []).forEach(function (doc) {
          var v = doc.data ? doc.data() : doc;
          if (!v || !v.page) return;
          marks[v.page] = { mark: v.mark, comment: v.comment || "" };
          if (v.reviewer && !reviewerEl.value) reviewerEl.value = v.reviewer;
          paint(v.page); found++;
        });
        var t = tally();
        setStatus(found ? "Restored " + found + " earlier mark(s); " + (TOTAL - t.seen) + " page(s) still unseen." : "Nothing recorded yet.");
      });
    }).catch(function () { setStatus("Marks show here but are not being saved from this view."); });
  } else {
    setStatus("Marks show here but are not being saved from this view.");
  }
})();
</script>
`;
}
