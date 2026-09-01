import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { register } from "node:module";
import { chromium } from "playwright";
import { announceChromiumResolution, resolveApprovedChromiumExecutable } from "../lib/approved-chromium.mjs";

const chromiumResolution = resolveApprovedChromiumExecutable({ managedExecutablePath: chromium.executablePath() });
announceChromiumResolution(chromiumResolution);

register("../lib/ts-esm-loader.mjs", import.meta.url);
register("../lib/internal-auth-test-loader.mjs", import.meta.url);

const doubles = await import("../lib/internal-auth-test-doubles.mjs");
const signOutRoute = await import("../../src/app/sign-out/route.ts");
const root = process.cwd();
const user = {
  id: "70000000-0000-4000-8000-000000000001",
  email: "admin@legalease.test"
};

const proxySource = fs.readFileSync(path.join(root, "src/proxy.ts"), "utf8");
const privateHeaderFunction = proxySource.match(
  /function applyPrivateInternalHeaders[\s\S]*?\n\}/u
)?.[0];
assert.ok(privateHeaderFunction, "internal private-header function is present");
const configuredPolicy = privateHeaderFunction.match(
  /response\.headers\.set\("Referrer-Policy",\s*"([^"]+)"\)/u
)?.[1];
assert.equal(
  configuredPolicy,
  "same-origin",
  "internal documents use the privacy-preserving same-origin referrer policy"
);
assert.match(
  privateHeaderFunction,
  /if \(pathname\.startsWith\("\/internal"\)\)/u,
  "the adjusted policy is scoped to internal responses"
);

assertCurrentInternalControls();
await runRequestBoundaryTests();
await runChromiumTests();

console.log(
  "Internal Sign Out browser security passed: five controls work in Chromium; cross-origin, unsafe, Origin:null, and GET requests cannot mutate the session."
);

async function runRequestBoundaryTests() {
  reset();
  const shellResponse = await signOutRoute.POST(request({ origin: "https://internal.test" }));
  assert.equal(shellResponse.status, 303);
  assert.equal(shellResponse.headers.get("location"), "https://internal.test/sign-in?signedOut=1");
  assert.match(shellResponse.headers.get("cache-control") ?? "", /\bno-store\b/u);
  assert.equal(shellResponse.headers.get("clear-site-data"), '"cache"');
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1);
  assert.equal(doubles.getInternalAuthTestState().lastSignOutScope, "local");

  reset();
  const deniedPageResponse = await signOutRoute.POST(request({
    referer: "https://internal.test/internal/partners/provisioning",
    body: new URLSearchParams({ intent: "switch-account" })
  }));
  assert.equal(deniedPageResponse.status, 303);
  assert.equal(deniedPageResponse.headers.get("location"), "https://internal.test/sign-in?switchAccount=1");
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1);

  for (const headers of [
    { origin: "https://evil.example" },
    { origin: "null" },
    { referer: "https://evil.example/forced-logout" },
    { origin: "https://evil.example", referer: "https://internal.test/internal" },
    { origin: "not a url", referer: "https://internal.test/internal" },
    {}
  ]) {
    reset();
    const response = await signOutRoute.POST(request(headers));
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control") ?? "", /\bno-store\b/u);
    assert.equal(response.headers.get("clear-site-data"), '"cache"');
    assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0, "unsafe request mutated the session");
    assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
    const payload = await response.json();
    assert.deepEqual(payload, { ok: false, error: "Invalid request origin." });
    assert.ok(!/session|partner|cookie|token/iu.test(JSON.stringify(payload)));
  }

  reset();
  const getResponse = await signOutRoute.GET(new Request("https://internal.test/sign-out"));
  assert.equal(getResponse.status, 303);
  assert.equal(getResponse.headers.get("location"), "https://internal.test/sign-in");
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0);
  assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
}

async function runChromiumTests() {
  const signOutRequests = [];
  const collectedCrossOriginRequests = [];
  let protectedMutationCalls = 0;
  let appBase = "";
  let externalBase = "";

  const externalServer = http.createServer(async (incoming, outgoing) => {
    if (incoming.method === "GET" && incoming.url === "/attack") {
      sendHtml(
        outgoing,
        `<form action="${appBase}/sign-out" method="post"><button id="cross-origin-submit" type="submit">Cross-origin Sign Out</button></form>`,
        { headers: { "Referrer-Policy": "unsafe-url" } }
      );
      return;
    }
    if (incoming.method === "POST" && incoming.url === "/collect") {
      await readBody(incoming);
      collectedCrossOriginRequests.push({ ...incoming.headers });
      outgoing.writeHead(204);
      outgoing.end();
      return;
    }
    outgoing.writeHead(404);
    outgoing.end("Not found");
  });
  await listen(externalServer);
  externalBase = serverOrigin(externalServer);

  const appServer = http.createServer(async (incoming, outgoing) => {
    const requestUrl = new URL(incoming.url ?? "/", appBase);

    if (incoming.method === "GET" && controlForPath(requestUrl.pathname)) {
      const control = controlForPath(requestUrl.pathname);
      if (!hasActiveSession(incoming)) {
        sendHtml(outgoing, "<p>Access denied.</p>", { status: 401, internal: true });
        return;
      }
      sendHtml(outgoing, formMarkup(control), {
        internal: true,
        setSessionCookie: true
      });
      return;
    }

    if (incoming.method === "GET" && requestUrl.pathname === "/internal/no-referrer-regression") {
      sendHtml(outgoing, formMarkup({ id: "baseline", intent: "sign-out" }), {
        internal: true,
        policy: "no-referrer",
        setSessionCookie: true
      });
      return;
    }

    if (incoming.method === "GET" && requestUrl.pathname === "/internal/referrer-privacy") {
      sendHtml(
        outgoing,
        `<form action="${externalBase}/collect" method="post"><button id="privacy-submit" type="submit">Submit externally</button></form>`,
        { internal: true, setSessionCookie: true }
      );
      return;
    }

    if (incoming.method === "GET" && requestUrl.pathname === "/internal/protected") {
      const allowed = hasActiveSession(incoming);
      sendHtml(outgoing, allowed ? "<p>Protected internal page.</p>" : "<p>Access denied.</p>", {
        status: allowed ? 200 : 401,
        internal: true
      });
      return;
    }

    if (incoming.method === "POST" && requestUrl.pathname === "/internal/protected-operation") {
      await readBody(incoming);
      if (!hasActiveSession(incoming)) {
        outgoing.writeHead(401, privateHeaders(configuredPolicy));
        outgoing.end("Access denied.");
        return;
      }
      protectedMutationCalls += 1;
      outgoing.writeHead(204, privateHeaders(configuredPolicy));
      outgoing.end();
      return;
    }

    if (incoming.method === "GET" && requestUrl.pathname === "/consumer") {
      sendHtml(outgoing, formMarkup({ id: "consumer", intent: "sign-out" }), {
        setSessionCookie: true
      });
      return;
    }

    if (incoming.method === "GET" && requestUrl.pathname === "/sign-in") {
      sendHtml(outgoing, "<p>Signed out.</p>", {
        headers: { "Cache-Control": "private, no-store" }
      });
      return;
    }

    if (requestUrl.pathname === "/sign-out" && incoming.method === "GET") {
      const response = await signOutRoute.GET(new Request(`${appBase}/sign-out`));
      await pipeFetchResponse(response, outgoing);
      return;
    }

    if (requestUrl.pathname === "/sign-out" && incoming.method === "POST") {
      const body = await readBody(incoming);
      signOutRequests.push({
        headers: { ...incoming.headers },
        body: body.toString("utf8")
      });
      const response = await signOutRoute.POST(new Request(`${appBase}/sign-out`, {
        method: "POST",
        headers: incoming.headers,
        body
      }));
      await pipeFetchResponse(response, outgoing, {
        clearSessionCookie: response.status === 303
      });
      return;
    }

    outgoing.writeHead(404);
    outgoing.end("Not found");
  });
  await listen(appServer);
  appBase = serverOrigin(appServer);

  const browser = await chromium.launch({ headless: true, executablePath: chromiumResolution.executablePath });
  try {
    await proveNoReferrerRegression(browser, appBase, signOutRequests);

    const controls = [
      { id: "shell", path: "/internal/shell", intent: "sign-out" },
      { id: "denial-sign-out", path: "/internal/access-denied-sign-out", intent: "sign-out" },
      { id: "denial-switch-account", path: "/internal/access-denied-switch", intent: "switch-account" },
      { id: "content-sign-out", path: "/internal/content-denied-sign-out", intent: "sign-out" },
      { id: "content-switch-account", path: "/internal/content-denied-switch", intent: "switch-account" }
    ];
    for (const control of controls) {
      reset();
      protectedMutationCalls = 0;
      const context = await browser.newContext();
      await seedSession(context, appBase);
      const page = await context.newPage();
      const sourceUrl = `${appBase}${control.path}`;
      const documentResponse = await page.goto(sourceUrl);
      assert.equal(documentResponse?.status(), 200, `${control.id}: internal control renders`);
      assert.equal(
        documentResponse?.headers()["referrer-policy"],
        configuredPolicy,
        `${control.id}: canonical internal response policy reached Chromium`
      );
      assert.match(
        documentResponse?.headers()["cache-control"] ?? "",
        /(?:^|,)\s*private\b[\s\S]*\bno-store\b/u,
        `${control.id}: internal document remains private and no-store`
      );
      const requestCount = signOutRequests.length;
      const responsePromise = page.waitForResponse((response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/sign-out"
      );
      await page.locator("#internal-account-control").click();
      const response = await responsePromise;
      const transmitted = await response.request().allHeaders();
      const recorded = signOutRequests.at(-1);
      assert.equal(signOutRequests.length, requestCount + 1, `${control.id}: one form POST reached the route`);
      assert.equal(transmitted.origin, appBase, `${control.id}: Chromium supplied the application origin`);
      assert.equal(recorded.headers.origin, appBase, `${control.id}: server received the application origin`);
      assert.ok(
        transmitted.referer?.startsWith(sourceUrl),
        `${control.id}: Chromium supplied the same-origin internal Referer`
      );
      assert.equal(response.status(), 303, `${control.id}: Sign Out route accepted the browser form`);
      assert.match(response.headers()["cache-control"] ?? "", /\bno-store\b/u);
      const expectedDestination = control.intent === "switch-account"
        ? `${appBase}/sign-in?switchAccount=1`
        : `${appBase}/sign-in?signedOut=1`;
      assert.equal(response.headers().location, expectedDestination, `${control.id}: redirect stays local`);
      await page.waitForURL(expectedDestination);
      assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1, `${control.id}: session mutation ran once`);
      assert.equal(doubles.getInternalAuthTestState().lastSignOutScope, "local");
      assert.equal(doubles.getInternalAuthTestState().user, null, `${control.id}: authenticated state was cleared`);
      assert.equal(
        (await context.cookies(appBase)).some((cookie) => cookie.name === "internal-session"),
        false,
        `${control.id}: browser session cookie was cleared`
      );

      const protectedResponse = await page.goto(`${appBase}/internal/protected`);
      assert.equal(protectedResponse?.status(), 401, `${control.id}: protected page is denied after Sign Out`);
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
      const operationResponsePromise = page.waitForResponse((candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname === "/internal/protected-operation"
      );
      await page.evaluate(() => {
        const form = document.createElement("form");
        form.method = "post";
        form.action = "/internal/protected-operation";
        document.body.append(form);
        form.submit();
      });
      const operationResponse = await operationResponsePromise;
      assert.equal(operationResponse.status(), 401, `${control.id}: Back cannot authorize an operation`);
      assert.equal(protectedMutationCalls, 0, `${control.id}: no protected operation ran after Sign Out`);
      await context.close();
    }

    await proveCrossOriginDenial(browser, appBase, externalBase, signOutRequests);
    await proveCrossOriginReferrerPrivacy(browser, appBase, signOutRequests, collectedCrossOriginRequests);
    await proveGetDoesNotMutate(browser, appBase);
    await proveConsumerControlUnchanged(browser, appBase);
  } finally {
    await browser.close();
    await close(appServer);
    await close(externalServer);
  }

  assert.equal(protectedMutationCalls, 0, "same-origin request metadata alone never authorized another mutation");
}

async function proveNoReferrerRegression(browser, appBase, signOutRequests) {
  reset();
  const context = await browser.newContext();
  await seedSession(context, appBase);
  const page = await context.newPage();
  const documentResponse = await page.goto(`${appBase}/internal/no-referrer-regression`);
  assert.equal(documentResponse?.headers()["referrer-policy"], "no-referrer");
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/sign-out"
  );
  await page.locator("#internal-account-control").click();
  const response = await responsePromise;
  const transmitted = await response.request().allHeaders();
  assert.equal(transmitted.origin, "null", "Chromium reproduces the former Origin:null request");
  assert.equal(transmitted.referer, undefined, "Chromium reproduces the missing Referer");
  assert.equal(signOutRequests.at(-1).headers.origin, "null");
  assert.equal(signOutRequests.at(-1).headers.referer, undefined);
  assert.equal(response.status(), 403, "Origin:null without application-issued source proof is denied");
  assert.match(response.headers()["cache-control"] ?? "", /\bno-store\b/u);
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0, "the reproduced request cannot mutate auth");
  assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
  await context.close();
}

async function proveCrossOriginDenial(browser, appBase, externalBase, signOutRequests) {
  reset();
  const context = await browser.newContext();
  await seedSession(context, appBase);
  const page = await context.newPage();
  await page.goto(`${appBase}/internal/shell`);
  await page.goto(`${externalBase}/attack`);
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/sign-out"
  );
  await page.locator("#cross-origin-submit").click();
  const response = await responsePromise;
  const transmitted = await response.request().allHeaders();
  assert.equal(transmitted.origin, externalBase, "Chromium identifies the cross-origin submitter");
  assert.ok(transmitted.referer?.startsWith(`${externalBase}/attack`));
  assert.equal(signOutRequests.at(-1).headers.origin, externalBase);
  assert.equal(response.status(), 403, "cross-origin HTML form POST is denied");
  assert.match(response.headers()["cache-control"] ?? "", /\bno-store\b/u);
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0);
  assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
  const payload = await response.json();
  assert.deepEqual(payload, { ok: false, error: "Invalid request origin." });
  assert.ok(!/session|partner|cookie|token/iu.test(JSON.stringify(payload)));
  await context.close();
}

async function proveCrossOriginReferrerPrivacy(browser, appBase, signOutRequests, collectedRequests) {
  reset();
  const context = await browser.newContext();
  await seedSession(context, appBase);
  const page = await context.newPage();
  const documentResponse = await page.goto(`${appBase}/internal/referrer-privacy?private=path`);
  assert.equal(documentResponse?.headers()["referrer-policy"], configuredPolicy);
  const beforeSignOutRequests = signOutRequests.length;
  const collectionPromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/collect"
  );
  await page.locator("#privacy-submit").click();
  await collectionPromise;
  const transmitted = collectedRequests.at(-1);
  assert.equal(transmitted.origin, "null", "cross-origin destination receives no internal origin");
  assert.equal(transmitted.referer, undefined, "cross-origin destination receives no internal path");
  assert.equal(signOutRequests.length, beforeSignOutRequests, "privacy probe did not invoke Sign Out");
  await context.close();
}

async function proveGetDoesNotMutate(browser, appBase) {
  reset();
  const context = await browser.newContext();
  await seedSession(context, appBase);
  const page = await context.newPage();
  await page.goto(`${appBase}/internal/shell`);
  const getResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname === "/sign-out"
  );
  await page.goto(`${appBase}/sign-out`);
  const getResponse = await getResponsePromise;
  assert.equal(getResponse.status(), 303);
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 0, "GET did not mutate the session");
  assert.equal(doubles.getInternalAuthTestState().user?.id, user.id);
  await context.close();
}

async function proveConsumerControlUnchanged(browser, appBase) {
  reset();
  const context = await browser.newContext();
  await seedSession(context, appBase);
  const page = await context.newPage();
  const consumerResponse = await page.goto(`${appBase}/consumer`);
  assert.equal(consumerResponse?.headers()["referrer-policy"], undefined, "consumer response policy is unchanged");
  const signOutResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/sign-out"
  );
  await page.locator("#internal-account-control").click();
  const signOutResponse = await signOutResponsePromise;
  assert.equal(signOutResponse.status(), 303, "consumer Sign Out still succeeds");
  assert.equal(doubles.getInternalAuthTestState().signOutCalls, 1);
  assert.equal(doubles.getInternalAuthTestState().lastSignOutScope, "local");
  await context.close();
}

function assertCurrentInternalControls() {
  const layout = fs.readFileSync(path.join(root, "src/app/internal/layout.tsx"), "utf8");
  const denied = fs.readFileSync(path.join(root, "src/lib/partners/internal-admin-gate.tsx"), "utf8");
  const contentDenied = fs.readFileSync(path.join(root, "src/components/content/admin/ContentDenied.tsx"), "utf8");
  const consumer = fs.readFileSync(path.join(root, "src/components/expungement-ai/ConsumerNav.tsx"), "utf8");
  assert.equal(countForms(layout), 1, "internal shell has one POST Sign Out control");
  assert.equal(countForms(denied), 2, "internal denial page has Sign Out and switch-account controls");
  assert.equal(countForms(contentDenied), 2, "content denial page has Sign Out and switch-account controls");
  assert.equal(countForms(consumer), 1, "consumer Sign Out remains an ordinary POST form");
  assert.match(denied, /name="intent" value="switch-account"/u);
  assert.match(contentDenied, /name="intent" value="switch-account"/u);
}

function controlForPath(pathname) {
  const controls = new Map([
    ["/internal/shell", { id: "shell", intent: "sign-out" }],
    ["/internal/access-denied-sign-out", { id: "denial-sign-out", intent: "sign-out" }],
    ["/internal/access-denied-switch", { id: "denial-switch-account", intent: "switch-account" }],
    ["/internal/content-denied-sign-out", { id: "content-sign-out", intent: "sign-out" }],
    ["/internal/content-denied-switch", { id: "content-switch-account", intent: "switch-account" }]
  ]);
  return controls.get(pathname);
}

function countForms(source) {
  return source.match(/<form action="\/sign-out" method="post">/gu)?.length ?? 0;
}

function formMarkup(control) {
  const field = control.intent === "switch-account"
    ? '<input type="hidden" name="intent" value="switch-account">'
    : "";
  return `<form action="/sign-out" method="post">${field}<button id="internal-account-control" type="submit">${control.id}</button></form>`;
}

function reset() {
  doubles.setInternalAuthTestState({ user, rows: [] });
}

function request({ origin, referer, body } = {}) {
  const headers = new Headers({ host: "internal.test" });
  if (origin !== undefined) headers.set("origin", origin);
  if (referer !== undefined) headers.set("referer", referer);
  if (body) headers.set("content-type", "application/x-www-form-urlencoded");
  return new Request("https://internal.test/sign-out", {
    method: "POST",
    headers,
    body
  });
}

function hasActiveSession(incoming) {
  return /(?:^|;\s*)internal-session=active(?:;|$)/u.test(incoming.headers.cookie ?? "") &&
    Boolean(doubles.getInternalAuthTestState().user);
}

async function seedSession(context, appBase) {
  await context.addCookies([{
    name: "internal-session",
    value: "active",
    url: appBase,
    httpOnly: true,
    sameSite: "Lax"
  }]);
}

function privateHeaders(policy) {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    "Referrer-Policy": policy,
    "X-Robots-Tag": "noindex, nofollow"
  };
}

function sendHtml(outgoing, markup, options = {}) {
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    ...(options.internal ? privateHeaders(options.policy ?? configuredPolicy) : {}),
    ...(options.setSessionCookie ? {
      "Set-Cookie": "internal-session=active; HttpOnly; SameSite=Lax; Path=/"
    } : {}),
    ...(options.headers ?? {})
  };
  outgoing.writeHead(options.status ?? 200, headers);
  outgoing.end(`<!doctype html><html><body>${markup}</body></html>`);
}

async function pipeFetchResponse(response, outgoing, options = {}) {
  const headers = Object.fromEntries(response.headers);
  if (options.clearSessionCookie) {
    headers["set-cookie"] = "internal-session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/";
  }
  outgoing.writeHead(response.status, headers);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

async function readBody(incoming) {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function serverOrigin(server) {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}
