import fs from "node:fs";
import path from "node:path";

const landingPath = path.join(process.cwd(), "design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html");

export function ExpungementLandingHandoff() {
  const source = fs.readFileSync(landingPath, "utf8");
  const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  const html = body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replaceAll('src="hero-', 'src="/expungement-ai/hero-')
    .replaceAll("srcset=\"hero-", "srcset=\"/expungement-ai/hero-")
    .replaceAll(", hero-", ", /expungement-ai/hero-")
    .replaceAll('href="#"', 'href="/expungement-ai/start"')
    .replaceAll('href="#start"', 'href="/expungement-ai/start"')
    .replaceAll('href="#how-it-works"', 'href="/expungement-ai#how-it-works"')
    .replaceAll('href="#pricing"', 'href="/expungement-ai/pricing"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#top"', 'href="/expungement-ai"');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div data-handoff-source="design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
