#!/usr/bin/env node
/**
 * Targeted issuer-source acquisition for the owner-supplied 28-family batch.
 *
 * This script downloads only original binary responses. It never prints a web
 * page to PDF. Every source receives a receipt whether it is acquired or not,
 * so an anti-bot refusal or a missing public binary remains visible evidence
 * rather than silently turning into a substitute.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const manifestPath = path.resolve(arg("--manifest", path.join(ROOT, "data/rcap-codex/source-acquisition-2026-09-04/manifest.json")));
const outDir = path.resolve(arg("--out", path.join(ROOT, "acquired-targeted-sources")));
const timeoutMs = Number(arg("--timeout-ms", "60000"));

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
  console.error("Manifest contains no sources.");
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, "sources"), { recursive: true });
fs.copyFileSync(manifestPath, path.join(outDir, "manifest.json"));

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const cleanWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value) => cleanWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
const safeSlug = (value) => String(value).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "source";
const truncate = (value, max = 14000) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}\n[truncated]` : text;
};

function rx(pattern) {
  if (!pattern) return null;
  const source = String(pattern).replace(/^\(\?i\)/, "");
  return new RegExp(source, "i");
}

function hostAllowed(url, allowedSuffixes = []) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedSuffixes.some((raw) => {
    const suffix = String(raw).toLowerCase().replace(/^\./, "");
    return host === suffix || host.endsWith(`.${suffix}`);
  });
}

function headersObject(headers) {
  const out = {};
  try {
    for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  } catch {
    for (const [key, value] of Object.entries(headers ?? {})) out[String(key).toLowerCase()] = String(value);
  }
  return out;
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(value) {
  return cleanWhitespace(decodeHtml(String(value ?? "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")));
}

function extractAnchors(html, baseUrl) {
  const links = [];
  const re = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of String(html ?? "").matchAll(re)) {
    const rawHref = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
    if (!rawHref || /^(javascript:|mailto:|tel:|#)/i.test(rawHref)) continue;
    let href;
    try {
      href = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }
    links.push({
      href,
      text: stripHtml(match[6]),
      rawHtml: truncate(match[6], 500),
    });
  }
  return links;
}

function chooseLink(links, candidate) {
  const textRe = rx(candidate.linkTextRegex);
  const hrefRe = rx(candidate.hrefRegex);
  const excludeRe = rx(candidate.excludeTextRegex);
  const preferExtension = String(candidate.preferExtension ?? "").toLowerCase();

  const ranked = [];
  for (const link of links) {
    const combined = `${link.text} ${link.href}`;
    if (excludeRe && excludeRe.test(combined)) continue;
    const textMatch = textRe ? textRe.test(link.text) : false;
    const hrefMatch = hrefRe ? hrefRe.test(link.href) : false;
    if (candidate.requireTextMatch !== false && textRe && !textMatch) continue;
    if (candidate.requireHrefMatch === true && hrefRe && !hrefMatch) continue;
    if ((textRe || hrefRe) && !textMatch && !hrefMatch) continue;

    let score = 0;
    if (textMatch) score += 100;
    if (hrefMatch) score += 30;
    if (preferExtension && new URL(link.href).pathname.toLowerCase().endsWith(preferExtension)) score += 20;
    if (/\.(pdf|docx?|rtf)(?:$|\?)/i.test(link.href)) score += 10;
    if (/download|file|media|document/i.test(link.href)) score += 2;
    ranked.push({ ...link, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.href.localeCompare(b.href));
  return { selected: ranked[0] ?? null, ranked: ranked.slice(0, 20) };
}

function parseContentDisposition(value) {
  if (!value) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value);
  if (star) {
    try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, "")); } catch { return star[1].trim(); }
  }
  const ordinary = /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i.exec(value);
  return ordinary ? (ordinary[1] ?? ordinary[2]).trim().replace(/^"|"$/g, "") : null;
}

function magicKind(bytes, contentType = "", url = "") {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return "empty";
  const head = bytes.subarray(0, Math.min(bytes.length, 512)).toString("latin1");
  const trimmed = head.replace(/^\uFEFF/, "").trimStart().toLowerCase();
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.subarray(0, 4).toString("hex") === "504b0304") {
    if (/docx|wordprocessingml/i.test(`${contentType} ${url}`)) return "docx";
    return "zip";
  }
  if (bytes.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1") return "doc";
  if (/^\{\\rtf/i.test(head)) return "rtf";
  if (/^<!doctype html|^<html|^<head|^<body|<html[\s>]/i.test(trimmed)) return "html";
  if (/text\/html/i.test(contentType)) return "html";
  return "unknown";
}

function isUsableBinary(result) {
  if (!result || !Buffer.isBuffer(result.bytes)) return false;
  if (!(result.status >= 200 && result.status < 300)) return false;
  const kind = magicKind(result.bytes, result.headers?.["content-type"], result.finalUrl);
  return ["pdf", "docx", "doc", "rtf", "zip"].includes(kind) && result.bytes.length > 100;
}

function extensionFor(kind, url, filename) {
  const named = path.extname(filename ?? "").toLowerCase();
  if (/^\.(pdf|docx?|rtf)$/.test(named)) return named;
  const urlExt = (() => {
    try { return path.extname(new URL(url).pathname).toLowerCase(); } catch { return ""; }
  })();
  if (/^\.(pdf|docx?|rtf)$/.test(urlExt)) return urlExt;
  return ({ pdf: ".pdf", docx: ".docx", doc: ".doc", rtf: ".rtf", zip: ".zip" })[kind] ?? ".bin";
}

function originalFilename(result, source) {
  const disposition = parseContentDisposition(result.headers?.["content-disposition"]);
  if (disposition) return path.basename(disposition);
  if (result.suggestedFilename) return path.basename(result.suggestedFilename);
  try {
    const base = path.basename(new URL(result.finalUrl || result.directUrl).pathname);
    if (base && base.includes(".")) return base;
  } catch {
    // Fall through.
  }
  const kind = magicKind(result.bytes, result.headers?.["content-type"], result.finalUrl);
  return `${safeSlug(source.sourceId)}${extensionFor(kind, result.finalUrl, null)}`;
}

async function nativeFetch(url, referer = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  const started = new Date().toISOString();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        "accept": "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/html;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        ...(referer ? { referer } : {}),
      },
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      method: "native_fetch",
      requestedUrl: url,
      directUrl: url,
      finalUrl: response.url,
      status: response.status,
      headers: headersObject(response.headers),
      bytes,
      started,
      completed: new Date().toISOString(),
    };
  } catch (error) {
    return {
      method: "native_fetch",
      requestedUrl: url,
      directUrl: url,
      finalUrl: null,
      status: null,
      headers: {},
      bytes: null,
      started,
      completed: new Date().toISOString(),
      error: String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timer);
  }
}

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    const moduleName = process.env.RCAP_PLAYWRIGHT_MODULE || "playwright";
    browserPromise = import(moduleName).then((module) => {
      const chromium = module.chromium ?? module.default?.chromium;
      if (!chromium) throw new Error(`Playwright chromium export not found in ${moduleName}`);
      return chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
    });
  }
  return browserPromise;
}

async function withBrowserContext(fn) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: USER_AGENT,
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}

async function browserLandingLinks(url) {
  return withBrowserContext(async (context) => {
    const page = await context.newPage();
    const started = new Date().toISOString();
    let response = null;
    let error = null;
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      await page.waitForTimeout(1500);
    } catch (cause) {
      error = String(cause?.message ?? cause);
    }
    let links = [];
    try {
      links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((a) => ({ href: a.href, text: (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim() }))
      );
    } catch {
      // Leave empty.
    }
    return {
      method: "browser_landing",
      requestedUrl: url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      headers: response ? await response.allHeaders() : {},
      links,
      started,
      completed: new Date().toISOString(),
      error,
    };
  });
}

async function browserFetch(url, preflightUrl = null) {
  return withBrowserContext(async (context) => {
    const page = await context.newPage();
    const started = new Date().toISOString();
    const diagnostics = [];
    if (preflightUrl) {
      try {
        const pre = await page.goto(preflightUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        diagnostics.push({ stage: "preflight", url: page.url(), status: pre?.status() ?? null });
        await page.waitForTimeout(1000);
      } catch (error) {
        diagnostics.push({ stage: "preflight", url: preflightUrl, error: String(error?.message ?? error) });
      }
    }

    try {
      const response = await context.request.get(url, {
        timeout: timeoutMs,
        failOnStatusCode: false,
        headers: preflightUrl ? { referer: preflightUrl } : {},
      });
      const bytes = Buffer.from(await response.body());
      const result = {
        method: "browser_context_request",
        requestedUrl: url,
        directUrl: url,
        finalUrl: response.url(),
        status: response.status(),
        headers: await response.allHeaders(),
        bytes,
        started,
        completed: new Date().toISOString(),
        diagnostics,
      };
      if (isUsableBinary(result)) return result;
      diagnostics.push({
        stage: "browser_context_request",
        status: result.status,
        kind: magicKind(bytes, result.headers?.["content-type"], result.finalUrl),
        bytes: bytes.length,
      });
    } catch (error) {
      diagnostics.push({ stage: "browser_context_request", error: String(error?.message ?? error) });
    }

    let download = null;
    page.once("download", (item) => { download = item; });
    let response = null;
    let navigationError = null;
    try {
      response = await page.goto(url, { waitUntil: "commit", timeout: timeoutMs });
    } catch (error) {
      navigationError = String(error?.message ?? error);
    }
    await page.waitForTimeout(2500);

    if (download) {
      try {
        const filePath = await download.path();
        if (filePath) {
          const bytes = fs.readFileSync(filePath);
          return {
            method: "browser_download",
            requestedUrl: url,
            directUrl: url,
            finalUrl: download.url(),
            status: response?.status() ?? 200,
            headers: response ? await response.allHeaders() : {},
            bytes,
            suggestedFilename: download.suggestedFilename(),
            started,
            completed: new Date().toISOString(),
            diagnostics,
            navigationError,
          };
        }
      } catch (error) {
        diagnostics.push({ stage: "browser_download", error: String(error?.message ?? error) });
      }
    }

    if (response) {
      try {
        const bytes = Buffer.from(await response.body());
        return {
          method: "browser_navigation_response",
          requestedUrl: url,
          directUrl: url,
          finalUrl: response.url(),
          status: response.status(),
          headers: await response.allHeaders(),
          bytes,
          started,
          completed: new Date().toISOString(),
          diagnostics,
          navigationError,
        };
      } catch (error) {
        diagnostics.push({ stage: "browser_navigation_body", error: String(error?.message ?? error) });
      }
    }

    return {
      method: "browser_navigation",
      requestedUrl: url,
      directUrl: url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      headers: response ? await response.allHeaders() : {},
      bytes: null,
      started,
      completed: new Date().toISOString(),
      diagnostics,
      error: navigationError ?? "browser navigation yielded no downloadable binary",
    };
  });
}

function attemptSummary(result, extra = {}) {
  if (!result) return { ...extra, outcome: "no_result" };
  const bytes = Buffer.isBuffer(result.bytes) ? result.bytes : null;
  return {
    ...extra,
    method: result.method,
    requestedUrl: result.requestedUrl,
    directUrl: result.directUrl,
    finalUrl: result.finalUrl,
    status: result.status,
    contentType: result.headers?.["content-type"] ?? null,
    contentDisposition: result.headers?.["content-disposition"] ?? null,
    byteLength: bytes?.length ?? null,
    sha256: bytes ? sha256(bytes) : null,
    detectedKind: bytes ? magicKind(bytes, result.headers?.["content-type"], result.finalUrl) : null,
    usableBinary: isUsableBinary(result),
    error: result.error ?? null,
    diagnostics: result.diagnostics ?? null,
    started: result.started ?? null,
    completed: result.completed ?? null,
  };
}

async function acquireDirect(source, candidate, attempts) {
  const browserFirst = candidate.methodPreference === "browser_first";
  const methods = browserFirst ? ["browser", "native"] : ["native", "browser"];
  for (const method of methods) {
    const result = method === "native"
      ? await nativeFetch(candidate.url, candidate.preflightUrl ?? null)
      : await browserFetch(candidate.url, candidate.preflightUrl ?? null);
    const summary = attemptSummary(result, { candidateKind: candidate.kind, candidateUrl: candidate.url });
    attempts.push(summary);
    if (!isUsableBinary(result)) continue;
    if (!hostAllowed(result.finalUrl || candidate.url, source.allowedHostSuffixes)) {
      summary.usableBinary = false;
      summary.error = `final host is outside approved suffixes: ${result.finalUrl}`;
      continue;
    }
    const hash = sha256(result.bytes);
    if (candidate.acceptOnlyIfExpectedHashMatches && !(source.expectedSha256 ?? []).includes(hash)) {
      summary.usableBinary = false;
      summary.error = `official mirror hash ${hash} does not match a pinned issuer hash`;
      continue;
    }
    return { ...result, directUrl: candidate.url, candidate };
  }
  return null;
}

async function acquireFromLanding(source, candidate, attempts) {
  let chosen = null;
  const landing = await nativeFetch(candidate.url);
  const nativeLinks = landing.bytes ? extractAnchors(landing.bytes.toString("utf8"), landing.finalUrl || candidate.url) : [];
  const nativeChoice = chooseLink(nativeLinks, candidate);
  attempts.push({
    ...attemptSummary(landing, { candidateKind: "landing_page", candidateUrl: candidate.url }),
    discoveredLinkCount: nativeLinks.length,
    selectedLink: nativeChoice.selected,
    rankedLinkCandidates: nativeChoice.ranked,
  });
  if (nativeChoice.selected) chosen = nativeChoice.selected;

  if (!chosen) {
    const browserLanding = await browserLandingLinks(candidate.url);
    const browserChoice = chooseLink(browserLanding.links ?? [], candidate);
    attempts.push({
      candidateKind: "browser_landing_page",
      candidateUrl: candidate.url,
      method: browserLanding.method,
      requestedUrl: browserLanding.requestedUrl,
      finalUrl: browserLanding.finalUrl,
      status: browserLanding.status,
      contentType: browserLanding.headers?.["content-type"] ?? null,
      discoveredLinkCount: (browserLanding.links ?? []).length,
      selectedLink: browserChoice.selected,
      rankedLinkCandidates: browserChoice.ranked,
      error: browserLanding.error ?? null,
      started: browserLanding.started,
      completed: browserLanding.completed,
    });
    if (browserChoice.selected) chosen = browserChoice.selected;
  }

  if (!chosen) return null;
  if (!hostAllowed(chosen.href, source.allowedHostSuffixes)) {
    attempts.push({
      candidateKind: "resolved_link_rejected",
      candidateUrl: candidate.url,
      directUrl: chosen.href,
      error: "resolved link host is outside approved official suffixes",
    });
    return null;
  }

  const directCandidate = {
    ...candidate,
    kind: "resolved_binary",
    url: chosen.href,
    preflightUrl: candidate.url,
    methodPreference: candidate.methodPreference ?? "native_first",
  };
  const acquired = await acquireDirect(source, directCandidate, attempts);
  if (acquired) {
    acquired.landingUrl = candidate.url;
    acquired.resolvedLinkText = chosen.text;
  }
  return acquired;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
    timeout: options.timeout ?? 30000,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message ?? result.error) : null,
  };
}

function pdfInfo(filePath) {
  const result = run("pdfinfo", [filePath]);
  const data = {};
  if (result.ok) {
    for (const line of result.stdout.split(/\r?\n/)) {
      const match = /^([^:]+):\s*(.*)$/.exec(line);
      if (match) data[match[1].trim()] = match[2].trim();
    }
  }
  return { raw: truncate(result.stdout, 12000), data, error: result.ok ? null : truncate(result.stderr || result.error, 2000) };
}

function docxText(filePath) {
  const xml = run("unzip", ["-p", filePath, "word/document.xml"], { maxBuffer: 20 * 1024 * 1024 });
  if (!xml.ok) return { text: "", error: truncate(xml.stderr || xml.error, 2000) };
  const text = decodeHtml(
    xml.stdout
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<[^>]+>/g, "")
  );
  return { text: cleanWhitespace(text).replace(/\s+(?=[A-Z][A-Za-z ]{3,}:)/g, "\n"), error: null };
}

function docText(filePath) {
  const result = run("antiword", [filePath], { maxBuffer: 20 * 1024 * 1024 });
  if (result.ok) return { text: result.stdout, error: null };
  const fallback = run("strings", ["-n", "4", filePath], { maxBuffer: 20 * 1024 * 1024 });
  return { text: fallback.stdout, error: truncate(result.stderr || result.error, 2000) };
}

function rtfText(filePath) {
  const result = run("unrtf", ["--text", filePath], { maxBuffer: 20 * 1024 * 1024 });
  if (result.ok) return { text: result.stdout, error: null };
  const fallback = run("strings", ["-n", "4", filePath], { maxBuffer: 20 * 1024 * 1024 });
  return { text: fallback.stdout, error: truncate(result.stderr || result.error, 2000) };
}

function inspectBinary(filePath, result) {
  const fileMime = run("file", ["--brief", "--mime-type", filePath]);
  let kind = magicKind(result.bytes, result.headers?.["content-type"], result.finalUrl);
  if (kind === "zip") {
    const listing = run("unzip", ["-l", filePath]);
    if (/word\/document\.xml/i.test(listing.stdout)) kind = "docx";
  }

  const inspection = {
    detectedKind: kind,
    mimeTypeFromFile: fileMime.ok ? cleanWhitespace(fileMime.stdout) : null,
    responseMimeType: result.headers?.["content-type"] ?? null,
    pageCount: null,
    extractedText: "",
    metadata: {},
    extractionError: null,
  };

  if (kind === "pdf") {
    const info = pdfInfo(filePath);
    inspection.metadata.pdfinfo = info.data;
    inspection.pageCount = info.data.Pages ? Number(info.data.Pages) : null;
    const args = ["-layout"];
    if (inspection.pageCount) args.push("-f", "1", "-l", String(Math.min(inspection.pageCount, 4)));
    args.push(filePath, "-");
    const text = run("pdftotext", args, { maxBuffer: 20 * 1024 * 1024 });
    inspection.extractedText = text.stdout;
    inspection.extractionError = text.ok ? info.error : truncate(text.stderr || text.error, 2000);
  } else if (kind === "docx") {
    const extracted = docxText(filePath);
    inspection.extractedText = extracted.text;
    inspection.extractionError = extracted.error;
    const core = run("unzip", ["-p", filePath, "docProps/core.xml"]);
    inspection.metadata.corePropertiesXml = core.ok ? truncate(core.stdout, 5000) : null;
  } else if (kind === "doc") {
    const extracted = docText(filePath);
    inspection.extractedText = extracted.text;
    inspection.extractionError = extracted.error;
  } else if (kind === "rtf") {
    const extracted = rtfText(filePath);
    inspection.extractedText = extracted.text;
    inspection.extractionError = extracted.error;
  }

  inspection.extractedText = truncate(inspection.extractedText, 30000);
  return inspection;
}

function titleTokens(value) {
  const stop = new Set(["the", "a", "an", "for", "of", "to", "and", "or", "under", "after", "on", "in"]);
  return cleanWhitespace(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stop.has(token));
}

function bestTitleLine(text, expected) {
  if (!expected || !text) return null;
  const expectedTokens = new Set(titleTokens(expected));
  if (expectedTokens.size === 0) return null;
  const rawLines = String(text).split(/\r?\n/).map(cleanWhitespace).filter((line) => line.length >= 4 && line.length <= 250);
  const candidates = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    candidates.push(rawLines[i]);
    if (rawLines[i + 1]) candidates.push(`${rawLines[i]} ${rawLines[i + 1]}`);
    if (rawLines[i + 2]) candidates.push(`${rawLines[i]} ${rawLines[i + 1]} ${rawLines[i + 2]}`);
  }
  let best = null;
  for (const candidate of candidates.slice(0, 250)) {
    const tokens = new Set(titleTokens(candidate));
    const overlap = [...expectedTokens].filter((token) => tokens.has(token)).length;
    const score = overlap / expectedTokens.size;
    if (!best || score > best.score || (score === best.score && candidate.length < best.text.length)) {
      best = { text: candidate, score };
    }
  }
  return best && best.score >= 0.55 ? best : null;
}

function identityReview(source, inspection) {
  const text = inspection.extractedText ?? "";
  const normalizedText = normalize(text);
  const titleBest = bestTitleLine(text, source.expectedPrintedTitle);
  const expectedForm = source.expectedPrintedFormNumber;
  const formVerified = expectedForm ? normalizedText.includes(normalize(expectedForm)) : null;

  const revision = source.expectedRevisionOrEffectiveDate;
  let revisionVerified = null;
  if (revision) {
    const digitGroups = String(revision).match(/\d+/g) ?? [];
    revisionVerified = digitGroups.length > 0 && digitGroups.every((group) => text.includes(group));
  }

  return {
    expectedTitle: source.expectedPrintedTitle ?? null,
    observedBestTitleText: titleBest?.text ?? null,
    titleTokenCoverage: titleBest?.score ?? null,
    titleVerified: source.expectedPrintedTitle ? Boolean(titleBest && titleBest.score >= 0.70) : null,
    expectedFormNumber: expectedForm ?? null,
    formNumberVerified: formVerified,
    expectedRevisionOrEffectiveDate: revision ?? null,
    revisionTokensVerified: revisionVerified,
    extractedTextAvailable: cleanWhitespace(text).length > 0,
  };
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  const text = String(value);
  if (text === "") return '""';
  return JSON.stringify(text);
}

function yamlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function toYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value.map((item) => {
      if (item && typeof item === "object") {
        const rendered = toYaml(item, indent + 2).split("\n");
        return `${pad}- ${rendered[0].trimStart()}\n${rendered.slice(1).join("\n")}`;
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join("\n");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return `${pad}{}`;
    return entries.map(([key, item]) => {
      if (item && typeof item === "object") {
        const rendered = toYaml(item, indent + 2);
        return `${pad}${yamlKey(key)}:\n${rendered}`;
      }
      return `${pad}${yamlKey(key)}: ${yamlScalar(item)}`;
    }).join("\n");
  }
  return `${pad}${yamlScalar(value)}`;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const receipts = [];

for (let index = 0; index < manifest.sources.length; index += 1) {
  const source = manifest.sources[index];
  const sourceDir = path.join(outDir, "sources", safeSlug(source.sourceId));
  fs.mkdirSync(sourceDir, { recursive: true });
  const attempts = [];
  let acquired = null;

  console.log(`\n[${index + 1}/${manifest.sources.length}] ${source.sourceId}`);
  for (const candidate of source.candidates ?? []) {
    try {
      acquired = candidate.kind === "landing_page"
        ? await acquireFromLanding(source, candidate, attempts)
        : await acquireDirect(source, candidate, attempts);
    } catch (error) {
      attempts.push({
        candidateKind: candidate.kind,
        candidateUrl: candidate.url,
        error: `unhandled candidate error: ${String(error?.stack ?? error)}`,
      });
    }
    if (acquired) break;
  }

  if (!acquired) {
    const receipt = {
      schemaVersion: "rcap-targeted-source-receipt/v1",
      batchId: manifest.batchId,
      sourceId: source.sourceId,
      status: "not_acquired",
      requiredForUserBatch: source.requiredForUserBatch !== false,
      reconciliationOnly: source.reconciliationOnly === true,
      familyIds: source.familyIds,
      repositorySourceLabels: source.repositorySourceLabels,
      issuingAuthority: source.issuingAuthority,
      officialLandingPages: source.officialLandingPages,
      expectedPrintedTitle: source.expectedPrintedTitle,
      expectedPrintedFormNumber: source.expectedPrintedFormNumber,
      expectedRevisionOrEffectiveDate: source.expectedRevisionOrEffectiveDate,
      expectedSha256: source.expectedSha256,
      scope: source.scope,
      relationship: source.relationship,
      notes: source.notes,
      attempts,
      recordedAt: new Date().toISOString(),
    };
    receipts.push(receipt);
    fs.writeFileSync(path.join(sourceDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    fs.writeFileSync(path.join(sourceDir, "receipt.yaml"), `${toYaml(receipt)}\n`);
    console.log("  NOT ACQUIRED");
    continue;
  }

  const hash = sha256(acquired.bytes);
  const kind = magicKind(acquired.bytes, acquired.headers?.["content-type"], acquired.finalUrl);
  const filename = originalFilename(acquired, source);
  const extension = extensionFor(kind, acquired.finalUrl, filename);
  const safeFilename = safeSlug(path.basename(filename, path.extname(filename))) + extension;
  const binaryPath = path.join(sourceDir, safeFilename);
  fs.writeFileSync(binaryPath, acquired.bytes);

  const inspection = inspectBinary(binaryPath, acquired);
  const identity = identityReview(source, inspection);
  fs.writeFileSync(path.join(sourceDir, "extracted-text.txt"), `${inspection.extractedText ?? ""}\n`);

  const expectedHashes = source.expectedSha256 ?? [];
  const matchingExpectedHashes = expectedHashes.filter((item) => item.toLowerCase() === hash);
  const contentLengthHeader = acquired.headers?.["content-length"] ? Number(acquired.headers["content-length"]) : null;

  const record = {
    "Family ID": source.familyIds,
    "Repository source label": source.repositorySourceLabels,
    "Issuing authority": source.issuingAuthority,
    "Official landing page": source.officialLandingPages,
    "Direct binary URL": acquired.directUrl,
    "Final resolved URL": acquired.finalUrl,
    "Printed title": identity.observedBestTitleText ?? source.expectedPrintedTitle ?? null,
    "Printed form number": source.expectedPrintedFormNumber ?? null,
    "Revision/effective date": source.expectedRevisionOrEffectiveDate ?? null,
    "Original filename": filename,
    "MIME type": inspection.mimeTypeFromFile ?? inspection.responseMimeType,
    "Page count": inspection.pageCount,
    "Byte length": acquired.bytes.length,
    "SHA-256": hash,
    "Statewide/county/court scope": source.scope,
    "Standalone, parent, continuation, or component": source.relationship,
    "Notes": [
      ...(source.notes ?? []),
      `Acquisition method: ${acquired.method}.`,
      expectedHashes.length === 0
        ? "No expected hash was supplied."
        : matchingExpectedHashes.length > 0
          ? `Matches expected SHA-256: ${matchingExpectedHashes.join(", ")}.`
          : `Does not match supplied expected SHA-256 value(s): ${expectedHashes.join(", ")}.`,
      identity.titleVerified === false ? "Expected title was not conclusively verified from extracted text; inspect the retained original." : null,
      identity.formNumberVerified === false ? "Expected form number was not found in extracted text; inspect the retained original." : null,
    ].filter(Boolean),
  };

  const receipt = {
    schemaVersion: "rcap-targeted-source-receipt/v1",
    batchId: manifest.batchId,
    sourceId: source.sourceId,
    status: "acquired",
    requiredForUserBatch: source.requiredForUserBatch !== false,
    reconciliationOnly: source.reconciliationOnly === true,
    familyIds: source.familyIds,
    repositorySourceLabels: source.repositorySourceLabels,
    issuingAuthority: source.issuingAuthority,
    officialLandingPages: source.officialLandingPages,
    directBinaryUrl: acquired.directUrl,
    finalResolvedUrl: acquired.finalUrl,
    redirected: acquired.directUrl !== acquired.finalUrl,
    responseHeaders: acquired.headers,
    responseContentLength: contentLengthHeader,
    byteLengthMatchesHeader: contentLengthHeader ? contentLengthHeader === acquired.bytes.length : null,
    originalFilename: filename,
    storedFilename: safeFilename,
    mimeType: inspection.mimeTypeFromFile ?? inspection.responseMimeType,
    responseMimeType: inspection.responseMimeType,
    detectedKind: inspection.detectedKind,
    pageCount: inspection.pageCount,
    byteLength: acquired.bytes.length,
    sha256: hash,
    expectedSha256: expectedHashes,
    matchingExpectedSha256: matchingExpectedHashes,
    matchesAnyExpectedSha256: expectedHashes.length ? matchingExpectedHashes.length > 0 : null,
    scope: source.scope,
    relationship: source.relationship,
    expectedPrintedTitle: source.expectedPrintedTitle,
    expectedPrintedFormNumber: source.expectedPrintedFormNumber,
    expectedRevisionOrEffectiveDate: source.expectedRevisionOrEffectiveDate,
    identityReview: identity,
    extractedTextPreview: truncate(inspection.extractedText, 8000),
    metadata: inspection.metadata,
    extractionError: inspection.extractionError,
    acquisitionMethod: acquired.method,
    resolvedLinkText: acquired.resolvedLinkText ?? null,
    attempts,
    notes: source.notes,
    userYamlRecord: record,
    acquiredAt: new Date().toISOString(),
  };
  receipts.push(receipt);
  fs.writeFileSync(path.join(sourceDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(sourceDir, "receipt.yaml"), `${toYaml(record)}\n`);
  console.log(`  ACQUIRED ${acquired.bytes.length} bytes ${hash}`);
}

if (browserPromise) {
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // No-op.
  }
}

const requiredReceipts = receipts.filter((item) => item.requiredForUserBatch);
const acquiredReceipts = receipts.filter((item) => item.status === "acquired");
const acquiredRequired = requiredReceipts.filter((item) => item.status === "acquired");
const hashGroups = {};
for (const receipt of acquiredReceipts) {
  if (!hashGroups[receipt.sha256]) hashGroups[receipt.sha256] = [];
  hashGroups[receipt.sha256].push(receipt.sourceId);
}

const familyStatus = manifest.familyIds.map((familyId) => {
  const dependencies = receipts.filter((item) => item.requiredForUserBatch && item.familyIds.includes(familyId));
  const missing = dependencies.filter((item) => item.status !== "acquired").map((item) => item.sourceId);
  return {
    familyId,
    requiredSourceCount: dependencies.length,
    acquiredSourceCount: dependencies.length - missing.length,
    status: missing.length === 0 ? "all_required_sources_acquired" : "source_acquisition_incomplete",
    missingSourceIds: missing,
  };
});

const summary = {
  schemaVersion: "rcap-targeted-source-acquisition-summary/v1",
  batchId: manifest.batchId,
  generatedAt: new Date().toISOString(),
  familyCount: manifest.familyIds.length,
  distinctSourcesPlanned: receipts.length,
  requiredDistinctSourcesPlanned: requiredReceipts.length,
  acquiredDistinctSources: acquiredReceipts.length,
  acquiredRequiredDistinctSources: acquiredRequired.length,
  notAcquiredSourceIds: receipts.filter((item) => item.status !== "acquired").map((item) => item.sourceId),
  acquiredWithExpectedHashMatch: acquiredReceipts.filter((item) => item.matchesAnyExpectedSha256 === true).map((item) => item.sourceId),
  acquiredWithExpectedHashMismatch: acquiredReceipts.filter((item) => item.matchesAnyExpectedSha256 === false).map((item) => item.sourceId),
  familiesFullyAcquired: familyStatus.filter((item) => item.status === "all_required_sources_acquired").length,
  familiesIncomplete: familyStatus.filter((item) => item.status !== "all_required_sources_acquired").length,
  familyStatus,
  duplicateHashGroups: Object.entries(hashGroups).filter(([, ids]) => ids.length > 1).map(([hash, ids]) => ({ sha256: hash, sourceIds: ids })),
  stillUnmadeByAcquisitionAlone: [
    "legal route suitability",
    "supersession where the issuer publishes no revision history",
    "field mapping and rendering compatibility",
    "permission to reproduce any third-party copyrighted form",
  ],
  receipts,
};

fs.writeFileSync(path.join(outDir, "acquisition-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "source-ledger.yaml"), `${toYaml(receipts.map((item) => item.userYamlRecord ?? {
  "Family ID": item.familyIds,
  "Repository source label": item.repositorySourceLabels,
  "Issuing authority": item.issuingAuthority,
  "Official landing page": item.officialLandingPages,
  "Direct binary URL": null,
  "Final resolved URL": null,
  "Printed title": item.expectedPrintedTitle ?? null,
  "Printed form number": item.expectedPrintedFormNumber ?? null,
  "Revision/effective date": item.expectedRevisionOrEffectiveDate ?? null,
  "Original filename": null,
  "MIME type": null,
  "Page count": null,
  "Byte length": null,
  "SHA-256": null,
  "Statewide/county/court scope": item.scope,
  "Standalone, parent, continuation, or component": item.relationship,
  "Notes": [...(item.notes ?? []), "NOT ACQUIRED; see receipt attempts."],
}))}\n`);

const sourceCsvHeaders = [
  "source_id", "status", "families", "repository_labels", "issuing_authority",
  "official_landing_pages", "direct_binary_url", "final_resolved_url",
  "printed_title", "printed_form_number", "revision_effective_date",
  "original_filename", "mime_type", "page_count", "byte_length", "sha256",
  "scope", "relationship", "expected_hash_match"
];
const sourceCsvRows = receipts.map((item) => [
  item.sourceId,
  item.status,
  item.familyIds,
  item.repositorySourceLabels,
  item.issuingAuthority,
  item.officialLandingPages,
  item.directBinaryUrl,
  item.finalResolvedUrl,
  item.userYamlRecord?.["Printed title"] ?? item.expectedPrintedTitle,
  item.userYamlRecord?.["Printed form number"] ?? item.expectedPrintedFormNumber,
  item.userYamlRecord?.["Revision/effective date"] ?? item.expectedRevisionOrEffectiveDate,
  item.originalFilename,
  item.mimeType,
  item.pageCount,
  item.byteLength,
  item.sha256,
  item.scope,
  item.relationship,
  item.matchesAnyExpectedSha256,
]);
fs.writeFileSync(
  path.join(outDir, "source-ledger.csv"),
  `${sourceCsvHeaders.map(csvCell).join(",")}\n${sourceCsvRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
);

const bindingHeaders = ["family_id", "source_id", "repository_source_labels", "status", "sha256", "stored_path"];
const bindingRows = [];
for (const receipt of receipts) {
  for (const familyId of receipt.familyIds) {
    bindingRows.push([
      familyId,
      receipt.sourceId,
      receipt.repositorySourceLabels,
      receipt.status,
      receipt.sha256,
      receipt.status === "acquired" ? `sources/${safeSlug(receipt.sourceId)}/${receipt.storedFilename}` : null,
    ]);
  }
}
fs.writeFileSync(
  path.join(outDir, "family-source-bindings.csv"),
  `${bindingHeaders.map(csvCell).join(",")}\n${bindingRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
);

const markdown = [
  `# Targeted source acquisition: ${summary.acquiredRequiredDistinctSources}/${summary.requiredDistinctSourcesPlanned} required sources acquired`,
  "",
  `- Batch: \`${summary.batchId}\``,
  `- Families fully supplied: **${summary.familiesFullyAcquired}/${summary.familyCount}**`,
  `- Distinct sources acquired: **${summary.acquiredDistinctSources}/${summary.distinctSourcesPlanned}** (includes reconciliation-only sources)`,
  `- Expected-hash matches: **${summary.acquiredWithExpectedHashMatch.length}**`,
  `- Expected-hash mismatches: **${summary.acquiredWithExpectedHashMismatch.length}**`,
  "",
  "| Source | Status | Families | Bytes | SHA-256 |",
  "| --- | --- | ---: | ---: | --- |",
  ...receipts.map((item) =>
    `| ${item.sourceId} | ${item.status} | ${item.familyIds.length} | ${item.byteLength ?? "—"} | ${item.sha256 ? item.sha256.slice(0, 16) : "—"} |`
  ),
  "",
  summary.notAcquiredSourceIds.length
    ? `Not acquired: ${summary.notAcquiredSourceIds.map((id) => `\`${id}\``).join(", ")}.`
    : "Every planned source was acquired.",
  "",
  "The artifact contains issuer binaries, one receipt per source, extracted text for identity review, YAML/CSV ledgers, and the family-to-source binding table.",
].join("\n");
fs.writeFileSync(path.join(outDir, "README.md"), `${markdown}\n`);

console.log(`\n${summary.acquiredRequiredDistinctSources}/${summary.requiredDistinctSourcesPlanned} required sources acquired.`);
console.log(`${summary.familiesFullyAcquired}/${summary.familyCount} families have every required source.`);
if (summary.notAcquiredSourceIds.length) console.log(`Not acquired: ${summary.notAcquiredSourceIds.join(", ")}`);
