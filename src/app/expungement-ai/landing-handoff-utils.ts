import {
  APPROVED_LANDING_COPY_EN,
  APPROVED_LANDING_COPY_ES
} from "@/app/expungement-ai/landing-approved-copy";

export function buildExpungementLandingHtml(source: string) {
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  return body
    .replace(/<div id="wilma-static"[\s\S]*?<\/div>\s*(?=<script)/i, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<section\b[^>]*class="[^"]*\bcred\b[^"]*"[^>]*>[\s\S]*?<\/section>/i, "")
    .replace(/<section\b[^>]*class="[^"]*\btesti\b[^"]*"[^>]*>[\s\S]*?<\/section>/i, "")
    .replace(/<section\b[^>]*class="[^"]*\bevidence\b[^"]*"[^>]*>[\s\S]*?<\/section>/i, "")
    .replace(/<div\b[^>]*class="[^"]*\bstat-mod\b[^"]*"[^>]*>[\s\S]*?<\/div>/i, "")
    .replace(/<div\b[^>]*class="[^"]*\bproof-side\b[^"]*"[^>]*>[\s\S]*?<\/div>/i, "")
    .replace(/<div\b[^>]*class="[^"]*\bsocials\b[^"]*"[^>]*>[\s\S]*?<\/div>/i, "")
    .replaceAll('src="hero-', 'src="/expungement-ai/hero-')
    .replaceAll('srcset="hero-', 'srcset="/expungement-ai/hero-')
    .replaceAll(", hero-", ", /expungement-ai/hero-")
    .replaceAll('src="shot-', 'src="/expungement-ai/shot-')
    .replaceAll('srcset="shot-', 'srcset="/expungement-ai/shot-')
    .replaceAll('src="wilma-avatar', 'src="/expungement-ai/wilma-avatar')
    .replaceAll('srcset="wilma-avatar', 'srcset="/expungement-ai/wilma-avatar')
    .replaceAll('src="evidence-', 'src="/expungement-ai/evidence-')
    .replaceAll('srcset="evidence-', 'srcset="/expungement-ai/evidence-')
    .replaceAll('src="testimonial-', 'src="/expungement-ai/testimonial-')
    .replaceAll('srcset="testimonial-', 'srcset="/expungement-ai/testimonial-')
    .replaceAll(
      '<a href="#" class="navlogin" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in?mode=signin" class="navlogin" data-i18n="nav_login">'
    )
    .replaceAll(
      '<a href="#" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in?mode=signin" data-i18n="nav_login">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="elig_cta">',
      '<a href="/expungement-ai/start" class="btn btn-primary" data-i18n-html="elig_cta">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="brief_cta">',
      '<a href="/expungement-ai/start" class="btn btn-primary" data-i18n-html="brief_cta">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="sm_cta">',
      '<a href="#sample" data-sample-packet-trigger="true" class="btn btn-primary" data-i18n-html="sm_cta">'
    )
    .replaceAll('href="#elig"', 'href="/expungement-ai/start"')
    .replaceAll('href="#how-it-works"', 'href="/expungement-ai#how-it-works"')
    .replaceAll('href="#what-you-get"', 'href="/expungement-ai#what-you-get"')
    .replaceAll('href="#pricing"', 'href="/expungement-ai#pricing"')
    .replaceAll('href="#privacy"', 'href="/expungement-ai#privacy"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#sample"', 'href="/expungement-ai#sample"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#top"', 'href="/expungement-ai"');
}

export function extractLandingDictionaries(source: string, renderedHtml = buildExpungementLandingHtml(source)) {
  const en = extractEnglishDictionary(renderedHtml);
  const es = readDictionary(source, "ES");
  Object.assign(en, APPROVED_LANDING_COPY_EN);
  Object.assign(es, APPROVED_LANDING_COPY_ES);
  return { en, es };
}

export function applyLandingDictionary(renderedHtml: string, dictionary: Record<string, string>) {
  const ranges: Array<{ start: number; end: number; replacement: string }> = [];
  const opening = /<([a-z0-9-]+)\b([^>]*\bdata-i18n(?:-html)?="([^"]+)"[^>]*)>/gi;
  for (const match of renderedHtml.matchAll(opening)) {
    const tag = match[1];
    const attrs = match[2];
    const key = match[3];
    const value = dictionary[key];
    if (typeof value !== "string" || match.index === undefined) continue;
    const openEnd = match.index + match[0].length;
    const tokenPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    tokenPattern.lastIndex = openEnd;
    let depth = 1;
    let token: RegExpExecArray | null;
    while ((token = tokenPattern.exec(renderedHtml))) {
      if (/^<\//.test(token[0])) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        ranges.push({
          start: match.index,
          end: tokenPattern.lastIndex,
          replacement: `<${tag}${attrs}>${value}</${tag}>`
        });
        break;
      }
    }
  }
  let next = renderedHtml;
  for (const range of ranges.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, range.start) + range.replacement + next.slice(range.end);
  }
  return next;
}

function readDictionary(source: string, name: "EN" | "ES") {
  const nextName = name === "ES" ? "EN" : "";
  const pattern = nextName
    ? new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});\\s*var ${nextName} =`)
    : new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});`);
  const match = source.match(pattern);
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, string>;
  } catch {
    return {};
  }
}

function extractEnglishDictionary(renderedHtml: string) {
  const english: Record<string, string> = {};
  const elementPattern = /<([a-z0-9-]+)\b([^>]*\bdata-i18n(?:-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of renderedHtml.matchAll(elementPattern)) {
    const attrs = match[2] ?? "";
    const key = match[3] ?? "";
    const body = match[4] ?? "";
    if (Object.prototype.hasOwnProperty.call(english, key)) continue;
    english[key] = attrs.includes("data-i18n-html")
      ? body.trim()
      : htmlToText(body);
  }
  return english;
}

function htmlToText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&#8594;/g, "→")
    .replace(/&#10003;/g, "✓")
    .replace(/&copy;/g, "©")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, " - ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
