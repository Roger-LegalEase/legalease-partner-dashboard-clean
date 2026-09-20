import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLOSURE_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/closure.json");
const RUNTIME_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/runtime-fixtures.json");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4317);

const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));
const runtime = JSON.parse(fs.readFileSync(RUNTIME_PATH, "utf8"));
const baselineByRoute = new Map(runtime.routes.map((row) => [row.routeKey, row.baseline]));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const rows = closure.routes.map((row, index) => {
    const baseline = baselineByRoute.get(row.routeKey);
    const paid = row.checkoutExpected === true;
    return `<article class="route" data-route-key="${escapeHtml(row.routeKey)}" data-payment="${paid}">
      <div class="ordinal">${String(index + 1).padStart(2, "0")}</div>
      <div class="route-copy">
        <h2>${escapeHtml(row.routeKey)}</h2>
        <p>${escapeHtml(row.timingResolution)}</p>
        <div class="runtime">actual evaluator: ${escapeHtml(baseline.resultCode)} · selected route exact · baseline payment ${baseline.paymentAllowed ? "open" : "closed"}</div>
      </div>
      <div class="badge ${paid ? "paid" : "closed"}">${paid ? "Checkout eligible" : "Checkout closed"}</div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Corrections A closure matrix fixture</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f3ee; color: #201f1b; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(1180px, calc(100% - 32px)); margin: 48px auto 72px; }
    header { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: end; margin-bottom: 28px; }
    .eyebrow { color: #6c675d; font: 700 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 8px 0 0; max-width: 760px; font: 650 clamp(34px, 5vw, 64px)/.98 Georgia, serif; letter-spacing: -.035em; }
    .summary { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .metric { min-width: 90px; padding: 12px 14px; border: 1px solid #d9d4c8; background: #fffdf8; }
    .metric strong { display: block; font-size: 22px; }
    .metric span { color: #6c675d; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .matrix { border-top: 1px solid #c9c3b6; }
    .route { display: grid; grid-template-columns: 46px minmax(0, 1fr) 150px; gap: 16px; align-items: start; padding: 18px 0; border-bottom: 1px solid #d9d4c8; }
    .ordinal { color: #8b8578; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .route h2 { margin: 0; overflow-wrap: anywhere; font: 700 14px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .route p { margin: 7px 0 0; color: #514d45; font-size: 13px; line-height: 1.5; }
    .runtime { margin-top: 8px; color: #777165; font-size: 11px; }
    .badge { justify-self: end; border: 1px solid; padding: 7px 9px; font-size: 11px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
    .badge.paid { border-color: #1f6a49; background: #e4f1e9; color: #154a34; }
    .badge.closed { border-color: #9b443b; background: #f7e8e4; color: #743127; }
    footer { margin-top: 24px; color: #6c675d; font-size: 12px; }
    @media (max-width: 640px) {
      main { width: min(100% - 24px, 520px); margin-top: 28px; }
      header { grid-template-columns: 1fr; align-items: start; }
      .summary { justify-content: flex-start; }
      .route { grid-template-columns: 32px minmax(0, 1fr); gap: 10px; }
      .badge { grid-column: 2; justify-self: start; }
      .route p { font-size: 12px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div><div class="eyebrow">RCAP · Corrections lane C</div><h1>36 routes, two exact paid authorities.</h1></div>
      <div class="summary"><div class="metric"><strong data-total>${closure.routes.length}</strong><span>assigned</span></div><div class="metric"><strong data-paid>${closure.routes.filter((row) => row.checkoutExpected).length}</strong><span>paid</span></div><div class="metric"><strong data-closed>${closure.routes.filter((row) => !row.checkoutExpected).length}</strong><span>closed</span></div></div>
    </header>
    <section class="matrix" aria-label="Corrections A route matrix">${rows}</section>
    <footer>Runtime fixture ${escapeHtml(runtime.schemaVersion)} · evaluator date ${escapeHtml(runtime.evaluatorToday)} · authority ${escapeHtml(closure.authority.sourceCandidateSha)}</footer>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/index.html") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(render());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`corrections-a browser fixture listening on http://127.0.0.1:${port}`);
});
