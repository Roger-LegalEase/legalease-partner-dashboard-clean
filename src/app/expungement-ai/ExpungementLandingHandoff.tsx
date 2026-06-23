import fs from "node:fs";
import path from "node:path";
import { ExpungementLandingInteractions } from "@/app/expungement-ai/ExpungementLandingInteractions";

const landingPath = path.join(process.cwd(), "design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html");
const noScriptRevealFallback = `
  #how-it-works .jstep {
    opacity: 1 !important;
    transform: none !important;
  }

  #how-it-works .jline {
    transform: scaleY(1) !important;
  }
`;

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
    .replaceAll('href="#pricing"', 'href="/expungement-ai#pricing"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#top"', 'href="/expungement-ai"')
    .replaceAll('href="/expungement-ai/start" class="navlogin"', 'href="/expungement-ai/sign-in" class="navlogin"')
    .replaceAll('<a href="/expungement-ai/start">Log in</a>', '<a href="/expungement-ai/sign-in">Log in</a>')
    .replaceAll('<div class="secondary"><a href="/expungement-ai/start">See how it works', '<div class="secondary"><a href="/expungement-ai#how-it-works">See how it works');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${styles}\n${noScriptRevealFallback}` }} />
      <div
        data-handoff-source="design-handoff/expungement-ai-frontend/files-6/Expungement-Landing-Full.html"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ExpungementLandingInteractions />
    </>
  );
}
